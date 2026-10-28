# Evaluation Benchmark Methodology

RepoPilot AI includes a reproducible evaluation benchmark composed of 10 documented Python edge-case bugs located in the bundled `examples/buggy-python-project`.

## Benchmark Test Suite

| Case ID | Category | Target Module | Known Issue | Expected Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **CASE-01** | ZeroDivisionError | `app/calculator.py` | `average([])` divides by length 0 | Raise `ValueError` on empty list |
| **CASE-02** | Boundary Validation | `app/calculator.py` | `calculate_discount` accepts `> 100%` or negative | Raise `ValueError` for invalid discount |
| **CASE-03** | Off-by-One Index | `app/calculator.py` | `range(1, len(numbers))` skips index 0 | Inspect all elements starting at index 0 |
| **CASE-04** | Empty String / Format | `app/calculator.py` | `parse_user_age(" ")` crashes without check | Raise `ValueError` for empty/whitespace string |
| **CASE-05** | Null / Empty Key | `app/calculator.py` | `format_user_summary(None)` crashes | Validate `user_id` is a non-empty string |
| **CASE-06** | KeyError | `app/data_store.py` | Direct dict lookup without check | Check key exists or return default |
| **CASE-07** | Mutable Default Arg | `app/data_store.py` | `cache=[]` leaks state across calls | Use `cache=None` and initialize inside body |
| **CASE-08** | Boundary Condition | `app/data_store.py` | `binary_search` sets `high = len(arr)` | Use `high = len(arr) - 1` to avoid IndexError |
| **CASE-09** | AttributeError / None | `app/data_store.py` | `read_config_value` calls `.get()` on None | Check if section is None before calling `.get()` |
| **CASE-10** | Negative Validation | `app/data_store.py` | `compute_tax` allows negative amount/rate | Raise `ValueError` for negative values |

## Measurement Metrics

Every benchmark case evaluates:
1. **Retrieval Accuracy**: Did repository search locate the exact file containing the defect?
2. **Localization Accuracy**: Did AST symbol parsing identify the target function/class and line numbers?
3. **Diagnosis Match**: Does the identified causal defect match the known ground truth?
4. **Reproduction Verification**: Did pytest execute the regression test to reproduce the bug on unpatched code?
5. **Execution Latency**: Time elapsed in milliseconds.

## Limitations

- Results reflect execution on the curated benchmark suite; performance may vary on arbitrary external repositories.
- When running in offline mode without Ollama, retrieval and symbol localization are measured deterministically; generative patch synthesis requires a running model.
