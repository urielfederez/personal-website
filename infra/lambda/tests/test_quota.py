import json
from unittest.mock import patch

import handler
from botocore.exceptions import ClientError


def test_quota_error_prevents_sending_email():
    event = {
        "body": json.dumps(
            {
                "name": "Test User",
                "email": "test@example.com",
                "message": "Hello, world!",
                "turnstileToken": "test-token",
            }
        ),
        "requestContext": {"http": {"sourceIp": "127.0.0.1"}},
        "isBase64Encoded": False,
    }

    with (
        patch(
            "handler.reserve_quota_slot",
            side_effect=ClientError(
                {
                    "Error": {
                        "Code": "InternalServerError",
                        "Message": "Simulated failure from DynamoDB",
                    }
                },
                "UpdateItem",
            ),
        ),
        patch(
            "handler.verify_turnstile",
            return_value={
                "success": True,
                "hostname": "urielfederez.com",
                "action": "contact",
            },
        ),
        patch("handler.send_email") as mock_send_email,
    ):
        result = handler.lambda_handler(event, None)

    assert result["statusCode"] == 503
    assert json.loads(result["body"]) == {
        "error": "Service temporarily unavailable. Please try again later"
    }
    mock_send_email.assert_not_called()


def test_quota_exhausted_prevents_sending_email():
    event = {
        "body": json.dumps(
            {
                "name": "Test User",
                "email": "test@example.com",
                "message": "Hello, world!",
                "turnstileToken": "test-token",
            }
        ),
        "requestContext": {"http": {"sourceIp": "127.0.0.1"}},
        "isBase64Encoded": False,
    }

    with (
        patch(
            "handler.reserve_quota_slot",
            return_value=False,
        ),
        patch(
            "handler.verify_turnstile",
            return_value={
                "success": True,
                "hostname": "urielfederez.com",
                "action": "contact",
            },
        ),
        patch("handler.send_email") as mock_send_email,
    ):
        result = handler.lambda_handler(event, None)

    assert result["statusCode"] == 429
    assert json.loads(result["body"]) == {
        "error": "Daily contact limit reached. Please try again tomorrow"
    }
    mock_send_email.assert_not_called()


def test_email_works_without_a_quota_error():
    event = {
        "body": json.dumps(
            {
                "name": "Test User",
                "email": "test@example.com",
                "message": "Hello, world!",
                "turnstileToken": "test-token",
            }
        ),
        "requestContext": {"http": {"sourceIp": "127.0.0.1"}},
        "isBase64Encoded": False,
    }

    with (
        patch(
            "handler.reserve_quota_slot",
            return_value=True,
        ),
        patch(
            "handler.verify_turnstile",
            return_value={
                "success": True,
                "hostname": "urielfederez.com",
                "action": "contact",
            },
        ),
        patch("handler.send_email") as mock_send_email,
    ):
        result = handler.lambda_handler(event, None)

    assert result["statusCode"] == 200
    assert json.loads(result["body"]) == {"message": "Your message has been sent."}
    mock_send_email.assert_called_once_with(
        "Test User",
        "test@example.com",
        "Hello, world!",
    )
