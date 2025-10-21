from fastapi.testclient import TestClient
from src.app import app, activities

client = TestClient(app)


def test_get_activities_returns_dict():
    resp = client.get('/activities')
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # should contain at least one known activity
    assert 'Gym Class' in data


def test_signup_and_unregister_flow():
    activity = 'Chess Club'
    email = 'teststudent@example.com'

    # ensure email not already in participants
    if email in activities[activity]['participants']:
        activities[activity]['participants'].remove(email)

    # sign up
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200
    body = resp.json()
    assert 'Signed up' in body['message']
    assert email in activities[activity]['participants']

    # duplicate signup should fail
    resp2 = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp2.status_code == 400

    # now unregister
    resp3 = client.delete(f"/activities/{activity}/signup?email={email}")
    assert resp3.status_code == 200
    assert email not in activities[activity]['participants']


def test_unregister_nonexistent_activity_or_participant():
    # non-existent activity
    resp = client.delete('/activities/NoSuchActivity/signup?email=nobody@example.com')
    assert resp.status_code == 404

    # unwritten participant
    activity = 'Math Club'
    email = 'i-dont-exist@example.com'
    # make sure not present
    activities[activity]['participants'] = [p for p in activities[activity]['participants'] if p != email]
    resp2 = client.delete(f"/activities/{activity}/signup?email={email}")
    assert resp2.status_code == 404
