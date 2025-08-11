# 🤝 Contributing Guide

Welcome to the Booklet Scanner project! We're excited to have you contribute to making document scanning more accessible and efficient.

## 🎯 Ways to Contribute

### 🐛 Bug Reports
- Report issues with detailed reproduction steps
- Include system information and error messages
- Provide screenshots when applicable

### 💡 Feature Requests
- Suggest new scanning features
- Propose UI/UX improvements
- Share ideas for performance enhancements

### 💻 Code Contributions
- Fix bugs and implement features
- Improve documentation
- Add tests and enhance code quality

### 📚 Documentation
- Update Wiki pages
- Improve README files
- Create tutorials and guides

## 🚀 Getting Started

### 1. Fork and Clone
```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR-USERNAME/BookletDC.git
cd BookletDC
```

### 2. Set Up Development Environment
```bash
# Follow the development setup guide
start.bat  # Automatic setup

# Or manual setup
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Create Feature Branch
```bash
# Create and switch to new branch
git checkout -b feature/your-feature-name

# Examples:
git checkout -b feature/scanner-gun-improvements
git checkout -b fix/camera-permission-issue
git checkout -b docs/update-installation-guide
```

## 📝 Development Guidelines

### Code Style

#### **Python (Backend):**
```python
# Follow PEP 8 conventions
# Use type hints
def process_image(image_data: bytes, quality: int = 95) -> str:
    """Process captured image and return filename.
    
    Args:
        image_data: Raw image bytes
        quality: Compression quality (0-100)
        
    Returns:
        Processed image filename
    """
    pass

# Use meaningful variable names
scanner_gun_input = request.form.get('qr_data')
processed_image_path = f"storage/processed/{filename}.jpg"
```

#### **JavaScript (Frontend):**
```javascript
// Use modern ES6+ features
const cameraManager = {
    async initializeCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 }
            });
            this.setupVideoStream(stream);
        } catch (error) {
            console.error('Camera initialization failed:', error);
        }
    }
};

// Use descriptive function names
function captureImageFromCamera() { /* ... */ }
function generatePDFFromImages() { /* ... */ }
```

### Project Structure

#### **Adding New Features:**
```
backend/api/           # Add new API endpoints here
├── new_feature.py     # New API module
└── __init__.py        # Update imports

frontend/static/js/    # Add frontend functionality
├── new-feature.js     # New JavaScript module
└── main.js           # Update imports

tests/                 # Add corresponding tests
├── test_new_feature.py
└── test_integration.py
```

### Testing Requirements

#### **Backend Tests:**
```python
# tests/test_camera.py
import pytest
from backend.api.camera import capture_image

def test_camera_capture():
    """Test image capture functionality."""
    result = capture_image(quality=95)
    assert result['status'] == 'success'
    assert 'filename' in result

@pytest.mark.asyncio
async def test_async_endpoint():
    """Test async API endpoint."""
    # Your async test code here
    pass
```

#### **Frontend Tests:**
```javascript
// tests/test_camera.js
describe('Camera Manager', () => {
    test('should initialize camera successfully', async () => {
        const camera = new CameraManager();
        const result = await camera.initialize();
        expect(result.status).toBe('success');
    });
});
```

### Documentation Standards

#### **Code Documentation:**
- **All functions** must have docstrings
- **API endpoints** must be documented
- **Complex algorithms** need inline comments
- **Configuration options** must be explained

#### **Commit Messages:**
```bash
# Format: type(scope): description

feat(camera): add support for multiple camera sources
fix(qr): resolve scanner gun detection issue  
docs(wiki): update installation guide for Anaconda
test(api): add integration tests for PDF generation
refactor(frontend): improve camera manager performance
```

## 🔄 Development Workflow

### 1. Planning Phase
- **Create or find issue** on GitHub Issues
- **Discuss approach** in issue comments
- **Get approval** for major changes

### 2. Development Phase
```bash
# Start with updated main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/scanner-improvements

# Make changes iteratively
# ... edit files ...
git add .
git commit -m "feat(scanner): add barcode detection"

# Push regularly
git push origin feature/scanner-improvements
```

### 3. Testing Phase
```bash
# Run all tests
pytest tests/

# Test manually
start.bat  # Verify functionality

# Check code quality
black backend/    # Format code
pylint backend/   # Lint code
```

### 4. Submission Phase
```bash
# Final push
git push origin feature/scanner-improvements

# Create Pull Request on GitHub
# Include:
# - Clear description of changes
# - Screenshots if UI changes
# - Test results
# - Breaking changes note (if any)
```

## 📋 Pull Request Guidelines

### PR Checklist:
- [ ] **Code follows style guidelines**
- [ ] **All tests pass**
- [ ] **Documentation updated**
- [ ] **No breaking changes** (or clearly noted)
- [ ] **Screenshots included** (for UI changes)
- [ ] **Performance impact assessed**

### PR Description Template:
```markdown
## Changes Made
- Brief description of changes
- List of modified files
- New features added

## Testing
- [ ] Manual testing completed
- [ ] Unit tests added/updated
- [ ] Integration tests pass

## Screenshots
<!-- Include screenshots for UI changes -->

## Breaking Changes
<!-- List any breaking changes -->

## Additional Notes
<!-- Any additional context or notes -->
```

## 🎨 UI/UX Contributions

### Design Guidelines:
- **Responsive design** - works on all screen sizes
- **Accessibility** - keyboard navigation, screen readers
- **Performance** - fast loading, smooth animations
- **Consistency** - follows existing design patterns

### CSS Standards:
```css
/* Use CSS custom properties for theming */
:root {
    --primary-color: #007bff;
    --secondary-color: #6c757d;
    --success-color: #28a745;
}

/* Follow BEM naming convention */
.camera-preview__container {
    display: flex;
    justify-content: center;
}

.camera-preview__video {
    max-width: 100%;
    border-radius: 8px;
}
```

## 🐛 Bug Fix Guidelines

### Bug Report Analysis:
1. **Reproduce the issue** consistently
2. **Identify root cause** through debugging
3. **Create minimal test case**
4. **Fix issue** with minimal code changes
5. **Add regression test**

### Bug Fix Process:
```bash
# Create bug fix branch
git checkout -b fix/camera-permission-issue

# Implement fix
# ... edit files ...

# Add regression test
# ... create test ...

# Verify fix
pytest tests/
start.bat  # Manual verification

# Submit PR
git push origin fix/camera-permission-issue
```

## 📚 Documentation Contributions

### Wiki Contributions:
- **Update existing pages** with new information
- **Create new guides** for advanced features
- **Add troubleshooting steps** for common issues
- **Include screenshots** and code examples

### README Updates:
- **Installation instructions** improvements
- **Feature descriptions** updates
- **Example usage** additions
- **FAQ entries** for common questions

## 🔒 Security Considerations

### Security Guidelines:
- **No sensitive data** in code or docs
- **Validate all inputs** from users
- **Sanitize file operations**
- **Use secure defaults**

### Security Review:
```python
# Good: Input validation
def process_qr_code(qr_data: str) -> str:
    if not qr_data or len(qr_data) > 1000:
        raise ValueError("Invalid QR code data")
    
    # Sanitize input
    safe_data = re.sub(r'[^\w\-_.]', '', qr_data)
    return safe_data

# Bad: Direct file operations without validation
def save_file(filename: str, data: bytes):
    with open(filename, 'wb') as f:  # Dangerous!
        f.write(data)
```

## 🚀 Release Process

### Version Numbering:
- **Major.Minor.Patch** (e.g., 1.2.3)
- **Major** - Breaking changes
- **Minor** - New features (backward compatible)
- **Patch** - Bug fixes

### Release Checklist:
- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version numbers updated
- [ ] Installation scripts tested
- [ ] Performance benchmarks run

## 🎉 Recognition

### Contributors:
All contributors will be:
- **Listed in CONTRIBUTORS.md**
- **Mentioned in release notes**
- **Tagged in social media announcements**
- **Invited to maintainer discussions**

### Maintainer Path:
Consistent contributors may be invited to become maintainers with:
- **Commit access** to main repository
- **Release management** responsibilities
- **Issue triage** permissions
- **Community leadership** role

## 📞 Getting Help

### Development Questions:
- **GitHub Discussions** - Ask development questions
- **Issues** - Report bugs or request features
- **Wiki** - Check existing documentation
- **Code Comments** - Read inline documentation

### Community:
- **Be respectful** to all community members
- **Help others** when possible
- **Share knowledge** through documentation
- **Celebrate contributions** from all skill levels

---

## 🎯 Priority Areas

We especially welcome contributions in:
- **Scanner gun compatibility** improvements
- **Camera performance** optimizations
- **PDF generation** enhancements
- **Cross-platform** support
- **Accessibility** improvements
- **Documentation** and tutorials

## 📋 Good First Issues

Look for issues labeled:
- `good-first-issue` - Perfect for new contributors
- `help-wanted` - Community input needed
- `documentation` - Non-code contributions welcome
- `bug` - Clear problem to solve

---

**Thank you for contributing to Booklet Scanner!** 🙏

*Together, we're making document scanning better for everyone!*
