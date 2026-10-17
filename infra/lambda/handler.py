import json
import os
import re
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import boto3
from botocore.exceptions import BotoCoreError, ClientError

AWS_REGION = "ap-southeast-1"
MAX_BODY_BYTES = 10_000
MAX_NAME_LENGTH = 100
MAX_MESSAGE_LENGTH = 5_000

ALLOWED_HOSTNAMES = {
    "urielfederez.com",
    "www.urielfederez.com",
}

TURNSTILE_SECRET_PARAMETER = os.environ["TURNSTILE_SECRET_PARAMETER"]
SES_FROM_ADDRESS = os.environ["SES_FROM_ADDRESS"]
SES_TO_ADDRESS = os.environ["SES_TO_ADDRESS"]

ssm = boto3.client("ssm", region_name=AWS_REGION)
ses = boto3.client("ses", region_name=AWS_REGION)

_turnstile_secret = None


def get_turnstile_secret():
    global _turnstile_secret

    if _turnstile_secret is None:
        result = ssm.get_parameter(
            Name=TURNSTILE_SECRET_PARAMETER,
            WithDecryption=True,
        )
        _turnstile_secret = result["Parameter"]["Value"]

    return _turnstile_secret


def validate_submission(body):
    if not isinstance(body, dict):
        raise TypeError("Expected a JSON object.")

    name = body.get("name")
    email = body.get("email")
    message = body.get("message")
    token = body.get("turnstileToken")

    if not all(isinstance(value, str) for value in (name, email, message, token)):
        raise TypeError("All fields are required.")

    name = name.strip()
    email = email.strip()
    message = message.strip()
    token = token.strip()

    if not name or len(name) > MAX_NAME_LENGTH:
        raise ValueError("Invalid name.")

    if not email or len(email) > 254:
        raise ValueError("Invalid email.")

    # TODO: Update email validation
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise ValueError("Invalid email address.")

    if not message or len(message) > MAX_MESSAGE_LENGTH:
        raise ValueError("Invalid message.")

    if not token or len(token) > 2_048:
        raise ValueError("Invalid verification token.")

    return name, email, message, token


def verify_turnstile(token, remote_ip=None):
    secret = get_turnstile_secret()
    fields = {
        "secret": secret,
        "response": token,
    }

    if remote_ip:
        fields["remoteip"] = remote_ip

    request = Request(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        data=urlencode(fields).encode(),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=5) as result:
            verification = json.loads(result.read())
    except (HTTPError, URLError, TimeoutError, ValueError):
        raise RuntimeError("Verification service unavailable.")

    return verification


def send_email(name, email, message):
    ses.send_email(
        Source=SES_FROM_ADDRESS,
        Destination={"ToAddresses": [SES_TO_ADDRESS]},
        ReplyToAddresses=[email],
        Message={
            "Subject": {"Data": f"Portfolio contact form: {name}", "Charset": "UTF-8"},
            "Body": {
                "Text": {
                    "Data": f"Name: {name}\nEmail: {email}\n\n{message}",
                    "Charset": "UTF-8",
                }
            },
        },
    )


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def lambda_handler(event, context):
    if event.get("isBase64Encoded"):
        return response(400, {"error": "Invalid request body."})

    raw_body = event.get("body")
    if not isinstance(raw_body, str):
        return response(400, {"error": "Missing request body."})

    if len(raw_body.encode("utf-8")) > MAX_BODY_BYTES:
        return response(400, {"error": "Request body too large"})

    try:
        body = json.loads(raw_body)
        name, email, message, token = validate_submission(body)
    except (json.JSONDecodeError, ValueError, TypeError):
        return response(400, {"error": "Invalid contact form submission"})

    remote_ip = event.get("requestContext", {}).get("http", {}).get("sourceIp")

    try:
        verification = verify_turnstile(token, remote_ip)

        if (
            verification.get("success") is not True
            or verification.get("hostname") not in ALLOWED_HOSTNAMES
            or verification.get("action") != "contact"
        ):
            return response(400, {"error": "Verification failed. Please retry"})

        send_email(name, email, message)
    except RuntimeError:
        return response(503, {"error": "Unable to verify submission right now."})
    except (ClientError, BotoCoreError):
        return response(500, {"error": "Unable to send your message right now."})

    return response(200, {"message": "Your message has been sent."})
