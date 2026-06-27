from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import asc
from sqlalchemy.orm import Session

from app.agents.enforcement_generator import generate_enforcement_notices
from app.db.connection import get_db
from app.models.db_models import EmissionSource, EnforcementNotice

router = APIRouter()

_VALID_STATUSES = {"pending", "dispatched", "completed"}


class NoticeItem(BaseModel):
    id: int
    attribution_id: int
    source_id: str
    source_name: str
    source_type: str
    rank: int
    status: str
    notice_json: Any
    notice_json_hindi: Optional[Any] = None
    created_at: Optional[str] = None


class GenerateBody(BaseModel):
    attribution_id: int


class StatusBody(BaseModel):
    status: str


def _notice_to_item(notice: EnforcementNotice, source: EmissionSource) -> NoticeItem:
    return NoticeItem(
        id=notice.id,
        attribution_id=notice.attribution_id,
        source_id=notice.source_id,
        source_name=source.name,
        source_type=source.source_type,
        rank=notice.rank,
        status=notice.status,
        notice_json=notice.notice_json,
        notice_json_hindi=None,
        created_at=notice.created_at.isoformat() if notice.created_at else None,
    )


@router.get("/notices", response_model=List[NoticeItem])
def list_notices(
    status: Optional[str] = Query(default=None),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = (
        db.query(EnforcementNotice, EmissionSource)
        .join(EmissionSource, EnforcementNotice.source_id == EmissionSource.source_id)
        .order_by(asc(EnforcementNotice.rank))
    )
    if status:
        if status not in _VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"status must be one of {_VALID_STATUSES}")
        q = q.filter(EnforcementNotice.status == status)
    rows = q.limit(limit).all()
    return [_notice_to_item(n, s) for n, s in rows]


@router.get("/notices/{notice_id}", response_model=NoticeItem)
def get_notice(notice_id: int, lang: str = Query(default="en"), db: Session = Depends(get_db)):
    row = (
        db.query(EnforcementNotice, EmissionSource)
        .join(EmissionSource, EnforcementNotice.source_id == EmissionSource.source_id)
        .filter(EnforcementNotice.id == notice_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Notice not found")
    notice, source = row
    item = _notice_to_item(notice, source)
    if lang == "hi":
        item.notice_json = item.notice_json_hindi
    return item


@router.post("/generate", response_model=List[NoticeItem])
def generate_notices(body: GenerateBody, db: Session = Depends(get_db)):
    notices = generate_enforcement_notices(body.attribution_id, db)
    return [
        NoticeItem(
            id=n["id"],
            attribution_id=n["attribution_id"],
            source_id=n["source_id"],
            source_name=n["source_name"],
            source_type=n["source_type"],
            rank=n["rank"],
            status=n["status"],
            notice_json=n["notice_json"],
            notice_json_hindi=n["notice_json_hindi"],
            created_at=n["created_at"],
        )
        for n in notices
    ]


@router.patch("/notices/{notice_id}/status", response_model=NoticeItem)
def update_notice_status(notice_id: int, body: StatusBody, db: Session = Depends(get_db)):
    if body.status not in _VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {_VALID_STATUSES}")

    row = (
        db.query(EnforcementNotice, EmissionSource)
        .join(EmissionSource, EnforcementNotice.source_id == EmissionSource.source_id)
        .filter(EnforcementNotice.id == notice_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Notice not found")

    notice, source = row
    notice.status = body.status
    db.commit()
    db.refresh(notice)
    return _notice_to_item(notice, source)
