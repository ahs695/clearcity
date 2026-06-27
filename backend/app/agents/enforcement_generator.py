from sqlalchemy.orm import Session
from app.models.db_models import EnforcementNotice, EmissionSource


def generate_enforcement_notices(attribution_id: int, db: Session) -> list[dict]:
    notices = (
        db.query(EnforcementNotice, EmissionSource)
        .join(EmissionSource, EnforcementNotice.source_id == EmissionSource.source_id)
        .filter(EnforcementNotice.attribution_id == attribution_id)
        .order_by(EnforcementNotice.rank.asc())
        .limit(3)
        .all()
    )

    if not notices:
        notices = (
            db.query(EnforcementNotice, EmissionSource)
            .join(EmissionSource, EnforcementNotice.source_id == EmissionSource.source_id)
            .order_by(EnforcementNotice.rank.asc())
            .limit(3)
            .all()
        )

    return [
        {
            "id": notice.id,
            "attribution_id": notice.attribution_id,
            "source_id": notice.source_id,
            "source_name": source.name,
            "source_type": source.source_type,
            "rank": notice.rank,
            "notice_json": notice.notice_json,
            "notice_json_hindi": None,
            "status": notice.status,
            "created_at": notice.created_at.isoformat() if notice.created_at else None,
        }
        for notice, source in notices
    ]
