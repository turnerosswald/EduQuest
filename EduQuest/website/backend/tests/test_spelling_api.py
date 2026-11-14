import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from api import app

client = TestClient(app)

def test_http_game_round_trip():
    assert client.get('/health').json() == {'ok': True}
    start = client.post('/spelling_bee/start', json={'level': 'Easy'})
    assert start.status_code == 200, start.text
    state = start.json()
    sid = state['session_id']
    answer = client.post('/spelling_bee/pronounce', json={'session_id': sid}).json()['word']
    result = client.post('/spelling_bee/answer', json={'session_id': sid, 'guess': answer})
    assert result.status_code == 200 and result.json()['score'] == 3
    next_result = client.post('/spelling_bee/next', json={'session_id': sid})
    assert next_result.status_code == 200 and next_result.json()['round_number'] == 2
    assert client.post('/spelling_bee/end', json={'session_id': sid}).status_code == 200
    assert client.post('/spelling_bee/next', json={'session_id': sid}).status_code == 404

def test_invalid_level_and_cors():
    assert client.post('/spelling_bee/start', json={'level': 'Unknown'}).status_code == 400
    response = client.options('/spelling_bee/start', headers={
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
    })
    assert response.status_code == 200
    assert response.headers['access-control-allow-origin'] == 'http://localhost:3000'
