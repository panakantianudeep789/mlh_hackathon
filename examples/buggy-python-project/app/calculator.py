"""
Calculator and Data Processing Utilities.
Contains known edge-case bugs for RepoPilot AI demonstration and benchmarking.
"""
from typing import List, Optional, Dict, Any


def average(numbers: List[float]) -> float:
    """
    Calculate the arithmetic mean of a list of numbers.
    
    Bug 1 (Empty List):
    When numbers is an empty list, len(numbers) is 0, causing ZeroDivisionError.
    Expected: Should raise ValueError("Cannot calculate average of an empty list")
    """
    # BUG: No empty list check before division
    return sum(numbers) / len(numbers)


def calculate_discount(price: float, discount_percent: float) -> float:
    """
    Calculate the final price after applying a percentage discount.
    
    Bug 2 (Boundary Condition & Validation):
    Discount percent must be between 0.0 and 100.0 inclusive, and price >= 0.
    Currently allows negative discounts and discounts > 100%, producing negative prices.
    Expected: Raise ValueError for invalid discount percentage.
    """
    # BUG: Missing validation for negative or > 100 discount percentage
    return price * (1.0 - (discount_percent / 100.0))


def find_first_positive(numbers: List[int]) -> Optional[int]:
    """
    Return the first strictly positive integer (> 0) from the list, or None.
    
    Bug 3 (Off-by-One Loop Index):
    Loops starting at index 1 instead of index 0, thereby ignoring the first element.
    Expected: Inspect all elements starting at index 0.
    """
    if not numbers:
        return None
    # BUG: Off-by-one loop index starts at 1, skipping index 0
    for i in range(1, len(numbers)):
        if numbers[i] > 0:
            return numbers[i]
    return None


def parse_user_age(age_str: str) -> int:
    """
    Parse an age string into a valid integer.
    
    Bug 4 (Unhandled Empty String / Format):
    Fails with ValueError without clean validation when an empty string or whitespace is passed.
    Expected: Raise ValueError("Age string cannot be empty") if empty, and validate 0 <= age <= 150.
    """
    # BUG: Stripping without checking for empty string before int conversion
    return int(age_str)


def format_user_summary(user_id: str, tags: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Format a user summary dictionary.
    
    Bug 5 (Missing Key & Null Handling):
    Fails when user_id is empty or None.
    Expected: Validates user_id is a non-empty string.
    """
    if user_id is None or user_id.strip() == "":
        raise ValueError("user_id is required")
    
    return {
        "user_id": user_id.strip(),
        "tags": tags if tags is not None else [],
        "tag_count": len(tags) if tags is not None else 0
    }
