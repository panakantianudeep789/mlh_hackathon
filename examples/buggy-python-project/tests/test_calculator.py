import pytest
import sys
import os

# Ensure app package is importable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.calculator import (
    average,
    calculate_discount,
    find_first_positive,
    parse_user_age,
    format_user_summary,
)


# ==========================================
# PASSING TESTS (BASELINE BEHAVIOR)
# ==========================================

def test_average_normal_numbers():
    assert average([10.0, 20.0, 30.0]) == 20.0
    assert average([5.0]) == 5.0
    assert average([-2.0, 2.0]) == 0.0


def test_calculate_discount_normal():
    assert calculate_discount(100.0, 20.0) == 80.0
    assert calculate_discount(50.0, 0.0) == 50.0


def test_find_first_positive_middle():
    # Passes because positive number is at index 2 (after index 0)
    assert find_first_positive([-5, -2, 7, 3]) == 7


def test_parse_user_age_valid():
    assert parse_user_age("25") == 25
    assert parse_user_age("100") == 100


def test_format_user_summary_valid():
    res = format_user_summary("alice", ["admin", "dev"])
    assert res["user_id"] == "alice"
    assert res["tag_count"] == 2


# ==========================================
# REGRESSION TESTS (DEMONSTRATING KNOWN BUGS)
# These tests expect the correct behavior and will fail on the unpatched code.
# ==========================================

@pytest.mark.xfail(reason="Bug: average([]) raises ZeroDivisionError instead of ValueError")
def test_average_empty_list_should_raise_value_error():
    with pytest.raises(ValueError, match="Cannot calculate average of an empty list"):
        average([])


@pytest.mark.xfail(reason="Bug: calculate_discount allows discount > 100%")
def test_calculate_discount_invalid_percent_should_raise():
    with pytest.raises(ValueError):
        calculate_discount(100.0, 150.0)


@pytest.mark.xfail(reason="Bug: find_first_positive skips index 0")
def test_find_first_positive_at_first_element():
    # If the first element is positive, index 0 is skipped by bug
    assert find_first_positive([10, -1, 5]) == 10
