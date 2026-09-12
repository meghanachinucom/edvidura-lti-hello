"""TLA-shaped read adapters + portable ADL-integrated helpers.

Portable (reuse in another app):
  shapes, requirements, adl_refs, xi_query, cmi5_requirements, vendor/

EdVidura wiring: service.py
"""

from app.modules.tla.adl_refs import ADL_REFS, list_adl_refs
from app.modules.tla.cmi5_requirements import (
    get_requirement,
    list_requirement_ids,
    load_cmi5_requirements,
    summarize_requirements,
)
from app.modules.tla.requirements import (
    EDVIDURA_EVIDENCE,
    REQUIREMENTS,
    assess_requirements,
)
from app.modules.tla.service import (
    catalogue_course,
    catalogue_courses,
    experience_index,
    learner_profile,
    maturity_report,
    xi_experience,
    xi_experiences,
)
from app.modules.tla.shapes import (
    SCHEMA_CATALOGUE,
    SCHEMA_EXPERIENCE,
    SCHEMA_PROFILE,
    SCHEMA_XI_COURSE,
    shape_catalogue_course,
    shape_catalogue_entry,
    shape_experience_from_xapi_row,
    shape_learner_profile,
    shape_xi_course_entry,
)
from app.modules.tla.xi_query import (
    attach_handle,
    filter_experiences,
    get_experience_by_id,
)

__all__ = [
    "ADL_REFS",
    "EDVIDURA_EVIDENCE",
    "REQUIREMENTS",
    "SCHEMA_CATALOGUE",
    "SCHEMA_EXPERIENCE",
    "SCHEMA_PROFILE",
    "SCHEMA_XI_COURSE",
    "assess_requirements",
    "attach_handle",
    "catalogue_course",
    "catalogue_courses",
    "experience_index",
    "filter_experiences",
    "get_experience_by_id",
    "get_requirement",
    "learner_profile",
    "list_adl_refs",
    "list_requirement_ids",
    "load_cmi5_requirements",
    "maturity_report",
    "shape_catalogue_course",
    "shape_catalogue_entry",
    "shape_experience_from_xapi_row",
    "shape_learner_profile",
    "shape_xi_course_entry",
    "summarize_requirements",
    "xi_experience",
    "xi_experiences",
]
