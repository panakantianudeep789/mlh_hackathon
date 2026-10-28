# Buggy Python Project (Demo Repository)

This is a self-contained Python project provided with RepoPilot AI for testing and demonstration purposes. It contains deliberately documented edge-case bugs designed to verify the complete investigation, patch proposal, and test verification pipeline.

## Modules

- `app/calculator.py`: Mathematical and utility functions.
  - `average(numbers)`: Calculates arithmetic mean. Fails with `ZeroDivisionError` on empty lists.
  - `calculate_discount(price, discount_percent)`: Calculates discount. Fails boundary validation.
  - `find_first_positive(numbers)`: Finds first positive integer. Contains an off-by-one bug skipping index 0.
  - `parse_user_age(age_str)`: Parses string to integer age.
  - `format_user_summary(user_id, tags)`: Generates user summaries.

## Tests

Run tests using pytest:
```bash
pytest
```
- Baseline tests pass.
- Regression tests (`@pytest.mark.xfail`) document current failing conditions before a patch is applied.
