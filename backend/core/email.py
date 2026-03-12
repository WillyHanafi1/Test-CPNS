from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from backend.config import settings

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

async def send_reset_password_email(email_to: EmailStr, reset_link: str):
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
        <h2 style="color: #4f46e5;">Reset Password CAT CPNS</h2>
        <p>Halo,</p>
        <p>Anda menerima email ini karena ada permintaan untuk mengatur ulang kata sandi akun Anda di platform simulasi CPNS.</p>
        <p>Klik tombol di bawah ini untuk membuat kata sandi baru. Link ini <b>hanya berlaku selama 15 menit</b> demi keamanan akun Anda.</p>
        <div style="text-align: center;">
            <a href="{reset_link}" style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold;">Reset Kata Sandi</a>
        </div>
        <p>Jika Anda tidak merasa meminta pengaturan ulang kata sandi ini, silakan abaikan email ini.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="font-size: 12px; color: #64748b;">Ini adalah email otomatis, mohon tidak membalas email ini.</p>
    </div>
    """

    message = MessageSchema(
        subject="Reset Password - CPNS Platform",
        recipients=[email_to],
        body=html,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    await fm.send_message(message)
