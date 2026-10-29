"""Core browser regression entrypoint for the current journey."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('journey_test.py')),run_name='__main__')
