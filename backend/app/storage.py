import secrets
from abc import ABC, abstractmethod
from pathlib import Path

from flask import current_app
from werkzeug.datastructures import FileStorage

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


class Storage(ABC):
    @abstractmethod
    def save(self, business_id: int, kind: str, file: FileStorage) -> str:
        """Persist `file` and return a public URL for it."""
        ...


class LocalStorage(Storage):
    """Dev/local-disk storage. Swap for an S3/R2-backed Storage in production --
    callers only depend on this `save() -> url` interface, not the disk layout.
    """

    def save(self, business_id: int, kind: str, file: FileStorage) -> str:
        ext = Path(file.filename or "").suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"Unsupported file type: {ext or 'unknown'}")

        folder = Path(current_app.config["UPLOADS_DIR"]) / str(business_id)
        folder.mkdir(parents=True, exist_ok=True)

        filename = f"{kind}-{secrets.token_hex(8)}{ext}"
        file.save(folder / filename)

        base_url = current_app.config["UPLOADS_BASE_URL"].rstrip("/")
        return f"{base_url}/{business_id}/{filename}"


def get_storage() -> Storage:
    return LocalStorage()
