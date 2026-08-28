import os
import sys
import subprocess
import argparse
from pathlib import Path

# Get the directory of the executable or script
base_dir = os.path.dirname(
    sys.executable if getattr(sys, "frozen", False) else __file__
)

# Example: Use base_dir to construct paths
run_js_path = os.path.abspath(os.path.normpath(os.path.join(base_dir, "../run.js")))


def handle_args(args):
    parser = argparse.ArgumentParser(description="Rendr - A rendering tool")
    version = parser.add_argument(
        "--version", action="version", version="Rendr version 1.0.0"
    )
    version.add_argument("version", help="Use this version of Rendr")

    # Add more argument definitions as needed
    return parser.parse_args(args)


def run(args=None):
    version_manager = handle_args(args)

    script_path = Path(run_js_path)
    command = ["node", script_path.resolve()]
    if args:
        command.extend(args)
    subprocess.run(command)


if __name__ == "__main__":
    run(sys.argv[1:])
