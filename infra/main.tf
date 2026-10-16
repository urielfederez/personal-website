data "aws_caller_identity" "current" {}

resource "aws_iam_role" "lambda_execution_role" {
  name = "portfolio-contact-form-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "ses_send_email" {
  name = "portfolio-contact-form-send-email"
  role = aws_iam_role.lambda_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail"
        ]
        Resource = "arn:aws:ses:ap-southeast-1:${data.aws_caller_identity.current.account_id}:identity/urielfederez.com"
      }
    ]
  })
}

resource "aws_lambda_function" "contact_form" {
  function_name = "portfolio-contact-form"
  role          = aws_iam_role.lambda_execution_role.arn
  runtime       = "python3.13"
  handler       = "handler.lambda_handler"

  filename         = data.archive_file.lambda_package.output_path
  source_code_hash = data.archive_file.lambda_package.output_base64sha256

  environment {
    variables = {
      TURNSTILE_SECRET_PARAMETER = "/portfolio/contact-form/turnstile-secret"
      SES_FROM_ADDRESS           = "contact@urielfederez.com"
      SES_TO_ADDRESS             = "urielfederez@gmail.com"
    }
  }
}

resource "aws_iam_role_policy" "read_turnstile_secret" {
  name = "portfolio-contact-form-read-turnstile-secret"
  role = aws_iam_role.lambda_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter"
        ]
        Resource = "arn:aws:ssm:ap-southeast-1:${data.aws_caller_identity.current.account_id}:parameter/portfolio/contact-form/turnstile-secret"
      }
    ]
  })
}

data "archive_file" "lambda_package" {
  type        = "zip"
  source_file = "${path.module}/lambda/handler.py"
  output_path = "${path.module}/lambda.zip"
}

resource "aws_apigatewayv2_api" "contact_form" {
  name          = "portfolio-contact-form"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = [
      "https://urielfederez.com",
      "https://www.urielfederez.com"
    ]
    allow_methods = ["POST"]
    allow_headers = ["content-type"]
    max_age       = 86400
  }
}

resource "aws_apigatewayv2_integration" "contact_form" {
  api_id                 = aws_apigatewayv2_api.contact_form.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.contact_form.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "contact_form" {
  api_id    = aws_apigatewayv2_api.contact_form.id
  route_key = "POST /contact"
  target    = "integrations/${aws_apigatewayv2_integration.contact_form.id}"
}

resource "aws_apigatewayv2_stage" "contact_form" {
  api_id      = aws_apigatewayv2_api.contact_form.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_rate_limit  = 1
    throttling_burst_limit = 2
  }
}

resource "aws_lambda_permission" "allow_api_gateway" {
  statement_id  = "AllowContactFormApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.contact_form.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.contact_form.execution_arn}/*/*"
}

output "contact_form_api_url" {
  description = "Base URL for the portfolio contact form API"
  value       = aws_apigatewayv2_api.contact_form.api_endpoint
}