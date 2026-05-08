#!/usr/bin/env python3
"""
File Watcher for Auto CI/CD

Watches for file changes and automatically runs CI pipeline.
Alternative to git hooks - runs on save.
"""

import subprocess
import sys
import time
import hashlib
from pathlib import Path
from datetime import datetime

class FileWatcher:
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.watch_patterns = ["src/**/*.ts", "src/**/*.json", "package.json"]
        self.ignore_patterns = ["node_modules", "dist", ".git", "cicd/logs"]
        self.file_hashes: dict[str, str] = {}
        self.last_run = datetime.min
        self.cooldown = 5  # seconds between runs

    def get_watched_files(self) -> list[Path]:
        """Get all files matching watch patterns."""
        files = []
        for pattern in self.watch_patterns:
            files.extend(self.project_root.glob(pattern))

        # Filter out ignored
        return [
            f for f in files
            if not any(ignore in str(f) for ignore in self.ignore_patterns)
        ]

    def hash_file(self, path: Path) -> str:
        """Get MD5 hash of file content."""
        try:
            return hashlib.md5(path.read_bytes()).hexdigest()
        except:
            return ""

    def check_changes(self) -> list[Path]:
        """Check for changed files."""
        changed = []
        current_files = self.get_watched_files()

        for file in current_files:
            current_hash = self.hash_file(file)
            previous_hash = self.file_hashes.get(str(file))

            if previous_hash != current_hash:
                changed.append(file)
                self.file_hashes[str(file)] = current_hash

        return changed

    def run_ci(self):
        """Run the CI pipeline."""
        print("\n" + "=" * 60)
        print(f"  Running CI... {datetime.now().strftime('%H:%M:%S')}")
        print("=" * 60)

        result = subprocess.run(
            ["python3", str(self.project_root / "cicd" / "runner.py"), "ci"],
            cwd=self.project_root
        )

        self.last_run = datetime.now()
        return result.returncode == 0

    def watch(self):
        """Start watching for changes."""
        print("╔" + "═" * 58 + "╗")
        print("║" + " CANCER FRAMEWORK - FILE WATCHER ".center(58) + "║")
        print("╚" + "═" * 58 + "╝")
        print(f"\n  Watching: {self.project_root}")
        print(f"  Patterns: {', '.join(self.watch_patterns)}")
        print(f"  Cooldown: {self.cooldown}s between runs")
        print("\n  Press Ctrl+C to stop\n")

        # Initial hash
        for file in self.get_watched_files():
            self.file_hashes[str(file)] = self.hash_file(file)

        print(f"  Tracking {len(self.file_hashes)} files...")

        try:
            while True:
                changed = self.check_changes()

                if changed:
                    elapsed = (datetime.now() - self.last_run).total_seconds()
                    if elapsed >= self.cooldown:
                        print(f"\n  Changed: {[f.name for f in changed[:3]]}")
                        self.run_ci()
                    else:
                        print(f"  (cooldown {self.cooldown - elapsed:.0f}s)")

                time.sleep(1)

        except KeyboardInterrupt:
            print("\n\n  Watcher stopped.")


def main():
    project_root = Path(__file__).parent.parent
    watcher = FileWatcher(project_root)
    watcher.watch()


if __name__ == "__main__":
    main()
