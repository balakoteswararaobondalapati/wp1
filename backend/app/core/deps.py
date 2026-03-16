from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.models import Role, User


oauth2_scheme = OAuth2PasswordBearer(tokenUrl='/api/auth/login', auto_error=False)


def get_current_user(request: Request, token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Could not validate credentials',
        headers={'WWW-Authenticate': 'Bearer'},
    )
    raw_token = token
    if not raw_token:
        cookie_token = request.cookies.get('access_token')
        if cookie_token:
            raw_token = cookie_token.replace('Bearer ', '')

    if not raw_token:
        raise credentials_exception

    try:
        payload = jwt.decode(raw_token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        subject = payload.get('sub')
        if not subject:
            raise credentials_exception
    except JWTError as exc:
        raise credentials_exception from exc

    user = db.query(User).filter(User.id == int(subject), User.is_active.is_(True)).first()
    if not user:
        raise credentials_exception
    return user


def require_roles(*roles: Role):
    def _role_guard(user: User = Depends(get_current_user)) -> User:
        if roles and user.role not in roles:
            raise HTTPException(status_code=403, detail='Forbidden')
        return user

    return _role_guard
