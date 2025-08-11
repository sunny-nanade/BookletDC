@echo off
echo Testing label jump...
goto :pythonfound

echo This should not print
pause

:pythonfound
echo SUCCESS: Label jump worked!
echo Setting up virtual environment...
pause
