import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.data_store import (
    get_user_role,
    append_to_cache,
    binary_search,
    read_config_value,
    compute_tax,
)


def test_get_user_role_found():
    users = {"alice": {"role": "admin"}}
    assert get_user_role(users, "alice") == "admin"


def test_append_to_cache_single():
    assert append_to_cache("first", []) == ["first"]


def test_binary_search_found():
    arr = [1, 3, 5, 7, 9]
    assert binary_search(arr, 5) == 2


def test_read_config_value_found():
    cfg = {"database": {"host": "localhost"}}
    assert read_config_value(cfg, "database", "host") == "localhost"


def test_compute_tax_normal():
    assert compute_tax(100.0, 0.05) == 5.0


# Known failing conditions
@pytest.mark.xfail(reason="Bug: get_user_role raises KeyError without friendly message")
def test_get_user_role_missing():
    with pytest.raises(KeyError, match="User not found"):
        get_user_role({}, "bob")


@pytest.mark.xfail(reason="Bug: append_to_cache uses mutable default argument")
def test_append_to_cache_default_isolation():
    # Calling twice with default should produce isolated list if fixed
    res1 = append_to_cache("item1")
    res2 = append_to_cache("item2")
    assert res1 == ["item1"]
    assert res2 == ["item2"]


@pytest.mark.xfail(reason="Bug: read_config_value fails with AttributeError if section missing")
def test_read_config_missing_section():
    assert read_config_value({}, "missing", "key") is None
