import smtplib
from abc import ABC, abstractmethod
from email.mime.text import MIMEText

from flask import current_app


class EmailSender(ABC):
    @abstractmethod
    def send(self, to_email: str, subject: str, body: str) -> None: ...


class StubEmailSender(EmailSender):
    """Dev fallback: logs to the console instead of sending anything, same role
    as StubNotifier for SMS/WhatsApp."""

    def send(self, to_email: str, subject: str, body: str) -> None:
        print(f"[stub-email] -> {to_email} | {subject}\n{body}", flush=True)


class SmtpEmailSender(EmailSender):
    """Plain SMTP rather than a specific provider's API -- works against Gmail,
    SendGrid/Mailgun/Postmark/SES's SMTP relays, or any other provider's SMTP
    endpoint without locking the app to one vendor's SDK.
    """

    def send(self, to_email: str, subject: str, body: str) -> None:
        message = MIMEText(body)
        message["Subject"] = subject
        message["From"] = current_app.config["SMTP_FROM_EMAIL"]
        message["To"] = to_email

        with smtplib.SMTP(
            current_app.config["SMTP_HOST"], current_app.config["SMTP_PORT"], timeout=10
        ) as server:
            if current_app.config["SMTP_USE_TLS"]:
                server.starttls()
            if current_app.config["SMTP_USERNAME"]:
                server.login(
                    current_app.config["SMTP_USERNAME"], current_app.config["SMTP_PASSWORD"]
                )
            server.sendmail(current_app.config["SMTP_FROM_EMAIL"], [to_email], message.as_string())


def get_email_sender() -> EmailSender:
    if current_app.config.get("SMTP_HOST"):
        return SmtpEmailSender()
    return StubEmailSender()
