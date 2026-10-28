import ast

from app.models.schemas import AstSymbol


def parse_python_ast(content: str) -> tuple[bool, list[AstSymbol], str | None]:
    """
    Parse Python source code into structured symbols (functions, classes, imports)
    with exact start and end line numbers.
    Gracefully handles syntax errors.
    """
    symbols: list[AstSymbol] = []
    try:
        tree = ast.parse(content)
    except SyntaxError as e:
        return False, [], f"Syntax error at line {e.lineno}, col {e.offset}: {e.msg}"
    except Exception as e:
        return False, [], f"Failed to parse AST: {e!s}"

    for node in tree.body:
        # 1. Functions
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            doc = ast.get_docstring(node)
            args = [a.arg for a in node.args.args]
            symbols.append(AstSymbol(
                name=node.name,
                type="function",
                start_line=node.lineno,
                end_line=getattr(node, "end_lineno", node.lineno),
                docstring=doc.strip() if doc else None,
                args=args
            ))

        # 2. Classes
        elif isinstance(node, ast.ClassDef):
            doc = ast.get_docstring(node)
            methods = [
                m.name for m in node.body if isinstance(m, (ast.FunctionDef, ast.AsyncFunctionDef))
            ]
            symbols.append(AstSymbol(
                name=node.name,
                type="class",
                start_line=node.lineno,
                end_line=getattr(node, "end_lineno", node.lineno),
                docstring=doc.strip() if doc else None,
                args=methods
            ))

            # Also add nested methods
            for item in node.body:
                if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    m_doc = ast.get_docstring(item)
                    m_args = [a.arg for a in item.args.args]
                    symbols.append(AstSymbol(
                        name=f"{node.name}.{item.name}",
                        type="function",
                        start_line=item.lineno,
                        end_line=getattr(item, "end_lineno", item.lineno),
                        docstring=m_doc.strip() if m_doc else None,
                        args=m_args
                    ))

        # 3. Imports
        elif isinstance(node, ast.Import):
            for alias in node.names:
                symbols.append(AstSymbol(
                    name=alias.name,
                    type="import",
                    start_line=node.lineno,
                    end_line=getattr(node, "end_lineno", node.lineno),
                    docstring=None,
                    args=None
                ))

        elif isinstance(node, ast.ImportFrom):
            module_name = node.module or ""
            for alias in node.names:
                symbols.append(AstSymbol(
                    name=f"{module_name}.{alias.name}" if module_name else alias.name,
                    type="import",
                    start_line=node.lineno,
                    end_line=getattr(node, "end_lineno", node.lineno),
                    docstring=None,
                    args=None
                ))

    return True, symbols, None


def extract_text_symbols(content: str, filename: str) -> tuple[bool, list[AstSymbol], str | None]:
    """
    Fallback text-based scanner for non-Python or unparsed files.
    Clearly reports is_parsed=False.
    """
    symbols: list[AstSymbol] = []
    lines = content.splitlines()

    for idx, line in enumerate(lines, start=1):
        stripped = line.strip()
        # Heuristic detection for JS/TS/Go/etc.
        if stripped.startswith("function ") or "const " in stripped and "=>" in stripped:
            name = stripped.split("(")[0].replace("function", "").replace("const", "").replace("export", "").strip()
            if name:
                symbols.append(AstSymbol(
                    name=name,
                    type="function",
                    start_line=idx,
                    end_line=idx,
                    docstring=None,
                    args=[]
                ))
        elif stripped.startswith("class ") or stripped.startswith("interface ") or stripped.startswith("type "):
            parts = stripped.split()
            if len(parts) >= 2:
                symbols.append(AstSymbol(
                    name=parts[1].split("{")[0].strip(),
                    type="class",
                    start_line=idx,
                    end_line=idx,
                    docstring=None,
                    args=[]
                ))

    return False, symbols, "Non-Python or syntax-invalid file; indexed using text-based scanner."
