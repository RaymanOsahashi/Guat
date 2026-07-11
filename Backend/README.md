# Activity Tracker API

A Django REST Framework backend for managing activities and tagging them, with flexible tag-based filtering (match any/all, exclusions).

## Tech Stack

- **Python / Django** 6.0.7
- **Django REST Framework**
- **PostgreSQL**

## Setup

### Prerequisites

- Python 3.x
- PostgreSQL running locally (or accessible)

### Installation

1. Clone the repo and create a virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

2. Install dependencies:

   ```bash
   pip install django djangorestframework psycopg2-binary
   ```

3. Configure the database. This project connects to a PostgreSQL database named `guat_db`. Create it locally:

   ```bash
   createdb guat_db
   ```

   > **Note:** Database credentials and the Django `SECRET_KEY` are currently hardcoded in `settings.py`. Before deploying anywhere beyond local development, move these into environment variables and set `DEBUG = False` with an explicit `ALLOWED_HOSTS`.

4. Run migrations:

   ```bash
   python manage.py migrate
   ```

5. Start the dev server:

   ```bash
   python manage.py runserver
   ```

## Data Model

### `Tag`
| Field | Type | Notes |
|---|---|---|
| `name` | CharField | Unique |
| `slug` | SlugField | Unique, auto-generated from `name` on save if left blank |

### `Activity`
| Field | Type | Notes |
|---|---|---|
| `name` | CharField | |
| `description` | TextField | Optional |
| `tags` | ManyToMany → `Tag` | Optional |
| `archived` | BooleanField | Defaults to `False` |

## API Endpoints

Base path assumed to be mounted at `/api/` (adjust to match your project's root `urls.py` include).

### Activities

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/activity/` | List all activities |
| `POST` | `/activity/` | Create an activity |
| `GET` | `/activity/<id>/` | Retrieve a single activity |
| `PUT` | `/activity/<id>/` | Replace an activity |
| `PATCH` | `/activity/<id>/` | Partially update an activity |
| `DELETE` | `/activity/<id>/` | Delete an activity |
| `GET` | `/activity/by-tags/` | List activities filtered by tags |
| `PATCH` | `/activity/<id>/tags/` | Set tags on an activity |

#### `GET /activity/by-tags/`

Filters activities by tag slug, with support for "any"/"all" matching and exclusion.

**Query parameters**

| Param | Required | Description |
|---|---|---|
| `tags` | One of `tags`/`exclude` required | Comma-separated tag slugs to filter by |
| `match` | No | `any` (default) or `all` — whether an activity must match at least one or every listed tag |
| `exclude` | One of `tags`/`exclude` required | Comma-separated tag slugs to exclude, regardless of `tags`/`match` |

**Examples**

```
GET /activity/by-tags/?tags=outdoor,free
GET /activity/by-tags/?tags=outdoor,free&match=all
GET /activity/by-tags/?tags=outdoor,free&exclude=low-energy
GET /activity/by-tags/?exclude=indoor
```

#### `PATCH /activity/<id>/tags/`

Sets the activity's tags to the given list of tag IDs.

**Body**
```json
{
  "tags": [1, 2, 3]
}
```

### Tags

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/tag/` | List all tags |
| `POST` | `/tag/` | Create a tag |
| `GET` | `/tag/<id>/` | Retrieve a single tag |
| `PUT` | `/tag/<id>/` | Replace a tag |
| `PATCH` | `/tag/<id>/` | Partially update a tag |
| `DELETE` | `/tag/<id>/` | Delete a tag |

**Tag body**
```json
{
  "name": "outdoor"
}
```
`slug` is read-only and auto-generated from `name`.

## Serializer Notes

- `ActivitySerializer` returns `tags` as full nested `TagSerializer` objects (`id`, `name`, `slug`) — read-only.
- Tags are assigned/updated via the dedicated `/activity/<id>/tags/` endpoint using tag **IDs**, not slugs or names.
