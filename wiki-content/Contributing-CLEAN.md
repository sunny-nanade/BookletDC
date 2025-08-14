# Contributing Guide

## Welcome Contributors!

Thank you for your interest in contributing to the Booklet Document Camera project! This guide will help you get started with contributing code, documentation, bug reports, and feature suggestions.

## Ways to Contribute

### 1. Bug Reports
- **Report issues** you encounter
- **Provide detailed information** about the problem
- **Include steps to reproduce** the issue
- **Share system information** (OS, browser, Python version)

### 2. Feature Requests
- **Suggest new features** that would be useful
- **Explain the use case** and benefits
- **Provide mockups** or detailed descriptions
- **Consider implementation complexity**

### 3. Code Contributions
- **Fix bugs** reported in GitHub Issues
- **Implement new features** from the roadmap
- **Improve performance** and optimization
- **Add tests** and documentation

### 4. Documentation
- **Improve existing documentation**
- **Add missing documentation**
- **Create tutorials** and examples
- **Fix typos** and formatting issues

### 5. Testing
- **Test on different platforms** (Windows, macOS, Linux)
- **Test with different browsers** (Chrome, Firefox, Safari, Edge)
- **Test with different cameras** and scanner guns
- **Report compatibility issues**

## Getting Started

### 1. Fork the Repository
```bash
# Visit GitHub repository
# Click "Fork" button in top-right corner
# This creates your own copy of the repository
```

### 2. Clone Your Fork
```bash
# Clone your forked repository
git clone https://github.com/YOUR-USERNAME/BookletDC.git
cd BookletDC

# Add upstream remote (original repository)
git remote add upstream https://github.com/sunny-nanade/BookletDC.git
```

### 3. Set Up Development Environment
```bash
# Follow Development Setup guide
# Install dependencies
pip install -r requirements.txt

# Install additional development tools
pip install black pylint pytest flake8

# Test that everything works
python backend/main.py
```

### 4. Create Feature Branch
```bash
# Always create new branch for your work
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description

# Keep branch names descriptive and concise
```

## Development Guidelines

### Code Style

#### Python Code Style
```python
# Follow PEP 8 style guide
# Use meaningful variable names
camera_manager = CameraManager()
image_data = capture_image()

# Add docstrings for functions and classes
def process_image(image_data: bytes) -> dict:
    """
    Process captured image data for PDF generation.
    
    Args:
        image_data: Raw image bytes from camera
        
    Returns:
        dict: Processed image metadata and path
    """
    pass

# Use type hints where possible
def create_pdf(images: List[str], output_path: str) -> bool:
    pass

# Format code with Black
black backend/
```

#### JavaScript Code Style
```javascript
// Use ES6+ features
const cameraManager = new CameraManager();
const images = await captureImages();

// Use meaningful function names
async function initializeCameraAccess() {
    // Function implementation
}

// Add comments for complex logic
// Initialize WebRTC camera stream with constraints
const stream = await navigator.mediaDevices.getUserMedia({
    video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: 'environment'
    }
});

// Use consistent indentation (2 spaces)
function processQRCode(qrData) {
  if (qrData && qrData.length > 0) {
    const processedData = qrData.trim();
    return processedData;
  }
  return null;
}
```

#### CSS Code Style
```css
/* Use meaningful class names */
.camera-preview-container {
    position: relative;
    width: 100%;
    max-width: 800px;
}

/* Group related properties */
.capture-button {
    /* Positioning */
    position: absolute;
    bottom: 20px;
    right: 20px;
    
    /* Appearance */
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 8px;
    
    /* Typography */
    font-size: 16px;
    font-weight: bold;
    
    /* Interaction */
    cursor: pointer;
    transition: background-color 0.3s ease;
}

/* Use consistent naming convention */
.pdf-generator__controls {
    /* BEM methodology preferred */
}
```

### Commit Guidelines

#### Commit Message Format
```
type(scope): brief description

Optional longer description explaining the change
in more detail. Keep lines under 80 characters.

Fixes #123
Closes #456
```

#### Commit Types
- **feat:** New feature
- **fix:** Bug fix
- **docs:** Documentation changes
- **style:** Code style changes (formatting, semicolons, etc.)
- **refactor:** Code refactoring without feature changes
- **test:** Adding or modifying tests
- **chore:** Maintenance tasks, dependency updates

#### Examples
```bash
# Good commit messages
git commit -m "feat(camera): add support for multiple camera selection"
git commit -m "fix(pdf): resolve image orientation issue in generated PDFs"
git commit -m "docs(readme): update installation instructions for Windows"
git commit -m "style(frontend): apply consistent formatting to CSS files"

# Poor commit messages (avoid these)
git commit -m "fixed bug"
git commit -m "update"
git commit -m "changes"
```

## Testing Guidelines

### Manual Testing
Before submitting your contribution, test thoroughly:

#### Camera Functionality
```javascript
// Test camera initialization
// Test image capture
// Test camera switching (if multiple cameras)
// Test error handling (no camera, permissions denied)
```

#### QR Code Scanning
```javascript
// Test QR detection from camera
// Test scanner gun input (if available)
// Test invalid QR code handling
// Test QR code with special characters
```

#### PDF Generation
```python
# Test single image PDF
# Test multiple images PDF
# Test different image formats
# Test large images
# Test PDF download
```

#### Cross-Platform Testing
- **Windows:** Test on Windows 10/11
- **macOS:** Test on recent macOS versions
- **Linux:** Test on Ubuntu/other distributions
- **Browsers:** Chrome, Firefox, Safari, Edge

### Automated Testing (Future)
```python
# Example test structure
def test_camera_api():
    """Test camera API endpoint."""
    response = client.get("/api/camera/status")
    assert response.status_code == 200
    assert "status" in response.json()

def test_pdf_generation():
    """Test PDF generation functionality."""
    test_images = ["test1.jpg", "test2.jpg"]
    result = generate_pdf(test_images)
    assert result["success"] is True
    assert os.path.exists(result["pdf_path"])
```

## Pull Request Process

### 1. Prepare Your Changes
```bash
# Ensure your code follows style guidelines
black backend/
pylint backend/

# Test your changes thoroughly
python backend/main.py
# Manual testing in browser

# Update documentation if needed
# Add/update comments in code
```

### 2. Sync with Upstream
```bash
# Fetch latest changes from upstream
git fetch upstream

# Merge upstream changes into your branch
git checkout main
git merge upstream/main

# Rebase your feature branch
git checkout feature/your-feature-name
git rebase main
```

### 3. Create Pull Request
1. **Push your branch** to your fork
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open Pull Request** on GitHub
   - Go to original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill out PR template

### 4. Pull Request Template
```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Tested on Windows
- [ ] Tested on macOS
- [ ] Tested on Linux
- [ ] Tested in Chrome
- [ ] Tested in Firefox
- [ ] Camera functionality works
- [ ] QR scanning works
- [ ] PDF generation works

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Related Issues
Fixes #123
Closes #456
```

### 5. Code Review Process
- **Automated checks** will run on your PR
- **Maintainers will review** your code
- **Address feedback** if requested
- **Make changes** in response to review
- **Update PR** with additional commits

### 6. Merge Process
- **PR approved** by maintainer
- **All checks passing**
- **Conflicts resolved**
- **Squash and merge** (typical approach)

## Issue Guidelines

### Bug Reports

#### Use Bug Report Template
```markdown
**Bug Description**
A clear and concise description of what the bug is.

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
A clear description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**System Information:**
- OS: [e.g. Windows 11]
- Browser: [e.g. Chrome 96]
- Python Version: [e.g. 3.9.13]
- Camera: [e.g. Built-in webcam, Logitech C920]

**Additional Context**
Add any other context about the problem here.
```

#### Bug Report Best Practices
- **Search existing issues** before creating new one
- **Use descriptive title** (not "Camera not working")
- **Include error messages** (copy exact text)
- **Add screenshots** when helpful
- **Test on clean environment** if possible

### Feature Requests

#### Use Feature Request Template
```markdown
**Feature Description**
A clear and concise description of the feature you'd like to see.

**Problem It Solves**
Explain what problem this feature would solve or what improvement it would bring.

**Proposed Solution**
Describe how you envision this feature working.

**Alternative Solutions**
Describe any alternative solutions or features you've considered.

**Use Cases**
Provide specific examples of how this feature would be used.

**Implementation Notes**
Any technical considerations or suggestions for implementation.
```

#### Feature Request Guidelines
- **Explain the use case** clearly
- **Consider existing functionality** (avoid duplicates)
- **Think about implementation complexity**
- **Be open to alternative solutions**

## Code Review Guidelines

### For Contributors
- **Be responsive** to review feedback
- **Ask questions** if feedback is unclear
- **Make requested changes** promptly
- **Test changes** after addressing feedback
- **Be patient** with the review process

### For Reviewers
- **Be constructive** and helpful
- **Explain reasoning** behind suggestions
- **Acknowledge good practices** in the code
- **Test the changes** when possible
- **Approve when ready** or request specific changes

## Release Process

### Version Numbering
- **Major:** Breaking changes (1.0.0 → 2.0.0)
- **Minor:** New features (1.0.0 → 1.1.0)
- **Patch:** Bug fixes (1.0.0 → 1.0.1)

### Release Checklist
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Version number bumped
- [ ] Changelog updated
- [ ] Release notes prepared
- [ ] Tagged in Git

## Communication

### GitHub Discussions
- **Ask questions** about development
- **Share ideas** for improvements
- **Get help** with setup or usage
- **Discuss architectural decisions**

### Issue Comments
- **Stay on topic** for the specific issue
- **Provide helpful information**
- **Be respectful** to all participants
- **Use reactions** instead of "+1" comments

## Recognition

### Contributors
All contributors will be recognized in:
- **README.md** contributors section
- **Release notes** for their contributions
- **GitHub repository** insights

### Types of Recognition
- **Code contributors:** Direct code contributions
- **Documentation contributors:** Docs and guides
- **Bug reporters:** Quality bug reports with good info
- **Testers:** Platform and compatibility testing
- **Community helpers:** Helping others in discussions

## Getting Help

### Where to Get Help
- **GitHub Discussions:** General questions and discussions
- **GitHub Issues:** Bug reports and feature requests
- **Documentation:** Wiki and README files
- **Code Comments:** Inline documentation in code

### What Information to Include
- **What you're trying to do**
- **What you've already tried**
- **Error messages** (exact text)
- **System information** (OS, browser, Python version)
- **Screenshots** if helpful

## Thank You!

Your contributions make this project better for everyone. Whether you're fixing a typo, adding a feature, or reporting a bug, every contribution is valuable and appreciated.

**Happy coding!**

---

## Quick Links

- **[Development Setup](Development-Setup)** - Get started with development
- **[Architecture Overview](Architecture-Overview)** - Understand the codebase
- **[Troubleshooting](Troubleshooting)** - Common issues and solutions
- **[GitHub Issues](https://github.com/sunny-nanade/BookletDC/issues)** - Report bugs and request features
- **[GitHub Discussions](https://github.com/sunny-nanade/BookletDC/discussions)** - Ask questions and share ideas

---

**Copyright © 2025 NMIMS (Narsee Monjee Institute of Management Studies)**

Made with ❤️ in MPSTME
