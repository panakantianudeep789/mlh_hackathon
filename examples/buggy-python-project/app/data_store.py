"""
Data storage, retrieval, and algorithm utilities.
Contains documented edge-case bugs for RepoPilot AI benchmark cases 6 to 10.
"""
from typing import Dict, Any, List, Optional


def get_user_role(users_dict: Dict[str, Dict[str, Any]], username: str) -> str:
    """
    Look up user role from user dictionary.
    
    Bug 6 (Direct Dict Lookup KeyError):
    Accesses users_dict[username]["role"] directly without checking if username or 'role' exists.
    Expected: Raise KeyError with friendly message or return 'guest' if not found.
    """
    # BUG: Direct access without key check
    return users_dict[username]["role"]


def append_to_cache(item: str, cache: List[str] = []) -> List[str]:  # noqa: B006
    """
    Append an item to a cache list.
    
    Bug 7 (Mutable Default Argument):
    Uses a mutable default list `cache=[]` which persists modifications across invocations.
    Expected: Use `cache: Optional[List[str]] = None`, initializing `cache = []` inside if None.
    """
    # BUG: Mutable default argument persists state across calls
    cache.append(item)
    return cache


def binary_search(arr: List[int], target: int) -> int:
    """
    Find index of target in sorted array, or return -1 if not found.
    
    Bug 8 (Boundary Condition in Binary Search):
    Initializes high = len(arr) and uses `while low <= high`, causing IndexError when target is greater than all elements.
    Expected: `high = len(arr) - 1`.
    """
    low = 0
    # BUG: high should be len(arr) - 1 to avoid IndexError
    high = len(arr)
    
    while low <= high:
        mid = (low + high) // 2
        if mid >= len(arr):
            break
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
            
    return -1


def read_config_value(config: Dict[str, Any], section: str, key: str) -> Optional[Any]:
    """
    Read a nested config key from config dictionary.
    
    Bug 9 (AttributeError / NoneType Unchecked):
    If config.get(section) is None (missing section), calling `.get(key)` raises AttributeError.
    Expected: Check if section is present and not None before calling `.get(key)`.
    """
    sec = config.get(section)
    # BUG: If sec is None, calling sec.get(key) raises AttributeError: 'NoneType' object has no attribute 'get'
    return sec.get(key)


def compute_tax(amount: float, tax_rate: float) -> float:
    """
    Compute tax rounded to 2 decimal places.
    
    Bug 10 (Negative Amount & Rate):
    Does not validate that amount >= 0 and 0 <= tax_rate <= 1.0.
    Expected: Raise ValueError("Amount and tax rate must be non-negative, and tax_rate <= 1.0")
    """
    # BUG: Missing validation for negative numbers
    return round(amount * tax_rate, 2)
