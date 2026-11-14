import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import spelling_bee_service as game


def test_all_word_banks_load():
    for level in game.LEVELS:
        words = game.load_bank(level)
        assert len(words) >= 15
        assert all(row['word'] and row['sentence'] for row in words)


def test_correct_answer_awards_three_points_and_advances():
    state = game.start('Easy')
    sid = state['session_id']
    correct = game.pronounce(sid)
    result = game.answer(sid, correct.upper())
    assert result['score'] == 3 and result['correct'] == 1
    assert result['result']['status'] == 'correct'
    next_state = game.next_word(sid)
    assert next_state['round_number'] == 2
    assert next_state['lives'] == 3
    game.end(sid)


def test_wrong_answers_reveal_after_three_attempts():
    state = game.start('Medium')
    sid = state['session_id']
    word = game.pronounce(sid)
    guess = '__not_an_actual_word__'
    assert guess.casefold() != word.casefold()
    one = game.answer(sid, guess)
    assert one['lives'] == 2 and one['hint']
    two = game.answer(sid, guess)
    assert two['lives'] == 1 and two['hint']
    three = game.answer(sid, guess)
    assert three['lives'] == 0 and three['result']['answer'] == word
    assert game.next_word(sid)['lives'] == 3
    game.end(sid)


def test_invalid_levels_rejected():
    import pytest
    with pytest.raises(ValueError):
        game.start('../../secrets')
