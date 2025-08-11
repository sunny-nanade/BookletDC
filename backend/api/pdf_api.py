"""
PDF Generation API endpoints
Handles PDF creation from scanned images
"""

from fastapi import APIRouter, HTTPException, Response, UploadFile, File, Form
from typing import List, Dict, Any, Optional
import base64
import json
import os
import time
from pathlib import Path

router = APIRouter()

# PDF generation will be implemented with ReportLab
# For now, we'll create placeholder endpoints

@router.post("/generate")
async def generate_pdf(request: Dict[str, Any]):
    """Generate PDF from scanned spreads"""
    try:
        spreads = request.get("spreads", [])
        options = request.get("options", {})
        
        if not spreads:
            raise HTTPException(status_code=400, detail="No spreads provided")
        
        # PDF generation options
        pdf_options = {
            "format": options.get("format", "A4"),
            "orientation": options.get("orientation", "portrait"),
            "quality": options.get("quality", "high"),
            "include_metadata": options.get("includeMetadata", True),
            "filename": options.get("filename", "scanned-booklet.pdf")
        }
        
        # Placeholder PDF generation
        # In real implementation, this would use ReportLab to create the PDF
        pdf_info = {
            "status": "generated",
            "filename": pdf_options["filename"],
            "pages": len(spreads),
            "size_mb": 2.5,  # Placeholder size
            "created_at": "now",
            "download_url": f"/api/pdf/download/{pdf_options['filename']}"
        }
        
        return {
            "status": "success",
            "message": "PDF generated successfully",
            "pdf": pdf_info,
            "options": pdf_options
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

@router.get("/download/{filename}")
async def download_pdf(filename: str):
    """Download a generated PDF file"""
    try:
        # Try multiple possible paths for the PDF file
        possible_paths = [
            Path(f"storage/generated_pdfs/{filename}"),
            Path(f"backend/storage/generated_pdfs/{filename}"),
            Path(__file__).parent.parent.parent / "backend" / "storage" / "generated_pdfs" / filename
        ]
        
        pdf_path = None
        for path in possible_paths:
            if path.exists():
                pdf_path = path
                break
                
        if not pdf_path:
            raise HTTPException(status_code=404, detail=f"PDF file not found: {filename}")
        
        # Read the actual file content
        with open(pdf_path, 'rb') as f:
            content = f.read()
        
        return Response(
            content=content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download PDF: {str(e)}")

@router.post("/save-generated")
async def save_generated_pdf(pdf: UploadFile = File(...), scan_duration: str = Form(None)):
    """Save a generated PDF file to storage"""
    try:
        # Determine storage directory
        storage_dir = Path("storage/generated_pdfs")
        if not storage_dir.exists():
            storage_dir = Path("backend/storage/generated_pdfs")
        if not storage_dir.exists():
            storage_dir = Path(__file__).parent.parent.parent / "backend" / "storage" / "generated_pdfs"
        
        # Create directory if it doesn't exist
        storage_dir.mkdir(parents=True, exist_ok=True)
        
        # Save the file
        file_path = storage_dir / pdf.filename
        with open(file_path, 'wb') as f:
            content = await pdf.read()
            f.write(content)
        
        # Save scan duration metadata if provided
        if scan_duration:
            try:
                duration_float = float(scan_duration)
                metadata_file = file_path.with_suffix('.json')
                metadata = {
                    "filename": pdf.filename,
                    "scan_duration": duration_float,
                    "created_at": time.time(),
                    "file_size": len(content)
                }
                with open(metadata_file, 'w') as f:
                    json.dump(metadata, f)
                print(f"📊 Saved scan duration metadata: {duration_float}s for {pdf.filename}")
            except ValueError:
                print(f"⚠️ Invalid scan duration format: {scan_duration}")
        
        # Clean up old PDFs after saving new one
        try:
            # Get all PDF files to check for cleanup
            pdf_files = []
            for pdf_file in storage_dir.glob("*.pdf"):
                try:
                    stat = pdf_file.stat()
                    metadata_file = pdf_file.with_suffix('.json')
                    scan_duration = None
                    if metadata_file.exists():
                        with open(metadata_file, 'r') as f:
                            metadata = json.load(f)
                            scan_duration = metadata.get("scan_duration")
                    
                    pdf_files.append({
                        "filename": pdf_file.name,
                        "created_at": stat.st_ctime,
                        "scan_duration": scan_duration
                    })
                except Exception as e:
                    continue
            
            # Sort by creation time and cleanup if needed
            pdf_files.sort(key=lambda x: x["created_at"], reverse=True)
            cleanup_count = await cleanup_old_pdfs(storage_dir, pdf_files, 5)
            
        except Exception as e:
            print(f"⚠️ PDF cleanup after save failed: {e}")
            cleanup_count = 0
        
        return {
            "status": "success",
            "message": f"PDF saved successfully: {pdf.filename}",
            "file_path": str(file_path),
            "size_bytes": len(content),
            "scan_duration": scan_duration,
            "cleaned_up_old_files": cleanup_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save PDF: {str(e)}")

@router.post("/export-images")
async def export_images(request: Dict[str, Any]):
    """Export scanned images as individual files or ZIP archive"""
    try:
        spreads = request.get("spreads", [])
        export_format = request.get("format", "zip")  # "zip" or "individual"
        
        if not spreads:
            raise HTTPException(status_code=400, detail="No spreads provided")
        
        # Count total images
        image_count = 0
        for spread in spreads:
            if spread.get("left_page"):
                image_count += 1
            if spread.get("right_page"):
                image_count += 1
        
        export_info = {
            "status": "exported",
            "format": export_format,
            "image_count": image_count,
            "spreads": len(spreads),
            "size_mb": image_count * 1.2,  # Placeholder size
            "created_at": "now"
        }
        
        if export_format == "zip":
            export_info["download_url"] = f"/api/pdf/download-images/archive_{len(spreads)}_spreads.zip"
        else:
            export_info["download_urls"] = [
                f"/api/pdf/download-images/page_{i+1}.jpg" for i in range(image_count)
            ]
        
        return {
            "status": "success",
            "message": f"Images exported as {export_format}",
            "export": export_info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export images: {str(e)}")

@router.get("/download-images/{filename}")
async def download_images(filename: str):
    """Download exported image files"""
    try:
        # In real implementation, this would serve the actual image files
        file_path = Path(f"storage/generated_pdfs/{filename}")
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Image file not found")
        
        # Determine content type based on file extension
        if filename.endswith('.zip'):
            media_type = "application/zip"
        elif filename.endswith('.jpg') or filename.endswith('.jpeg'):
            media_type = "image/jpeg"
        elif filename.endswith('.png'):
            media_type = "image/png"
        else:
            media_type = "application/octet-stream"
        
        return Response(
            content=b"Image content placeholder",
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download image: {str(e)}")

@router.get("/templates")
async def get_pdf_templates():
    """Get available PDF templates and formats"""
    return {
        "status": "success",
        "templates": [
            {
                "name": "Standard Booklet",
                "format": "A4",
                "orientation": "portrait",
                "description": "Standard A4 portrait layout for booklets"
            },
            {
                "name": "Landscape Spread",
                "format": "A4",
                "orientation": "landscape", 
                "description": "A4 landscape layout for side-by-side pages"
            },
            {
                "name": "Large Format",
                "format": "A3",
                "orientation": "portrait",
                "description": "A3 portrait for high-quality output"
            }
        ],
        "formats": ["A4", "Letter", "Legal", "A3"],
        "orientations": ["portrait", "landscape"],
        "quality_levels": ["draft", "standard", "high", "archive"]
    }

@router.get("/recent")
async def get_recent_pdfs(limit: int = 5):
    """Get list of recently generated PDFs"""
    try:
        # Try both absolute and relative paths
        pdf_dir = Path("storage/generated_pdfs")
        if not pdf_dir.exists():
            # Try relative to backend directory
            pdf_dir = Path("backend/storage/generated_pdfs")
        if not pdf_dir.exists():
            # Try absolute path from project root
            pdf_dir = Path(__file__).parent.parent.parent / "backend" / "storage" / "generated_pdfs"
            
        if not pdf_dir.exists():
            return {
                "status": "success", 
                "pdfs": [],
                "message": f"No PDFs directory found. Tried paths: storage/generated_pdfs, backend/storage/generated_pdfs, {pdf_dir}",
                "debug_info": {
                    "current_dir": str(Path.cwd()),
                    "script_dir": str(Path(__file__).parent),
                    "attempted_paths": [
                        "storage/generated_pdfs",
                        "backend/storage/generated_pdfs", 
                        str(pdf_dir)
                    ]
                }
            }
        
        # Get all PDF files with their metadata
        pdf_files = []
        for pdf_file in pdf_dir.glob("*.pdf"):
            try:
                stat = pdf_file.stat()
                size_mb = round(stat.st_size / (1024 * 1024), 2)
                if size_mb == 0:
                    size_mb = round(stat.st_size / 1024, 1) / 1000  # Convert KB to MB for small files
                creation_time = time.localtime(stat.st_mtime)
                
                # Parse filename to extract timing info if available
                # Format: STUDENT123_2025-01-18_14-30-25.pdf or similar
                name_parts = pdf_file.stem.split('_')
                scan_info = "Unknown"
                scan_duration = None
                
                # Try to read metadata file first
                metadata_file = pdf_file.with_suffix('.json')
                if metadata_file.exists():
                    try:
                        with open(metadata_file, 'r') as f:
                            metadata = json.load(f)
                            scan_duration = metadata.get('scan_duration')
                            print(f"📊 Loaded scan duration from metadata: {scan_duration}s for {pdf_file.name}")
                    except Exception as e:
                        print(f"⚠️ Failed to read metadata for {pdf_file.name}: {e}")
                
                if len(name_parts) >= 3:
                    try:
                        # Try to parse date and time from filename
                        date_part = name_parts[-2]  # 2025-01-18
                        time_part = name_parts[-1].replace('-', ':')  # 14:30:25
                        scan_info = f"{date_part} {time_part}"
                        
                        # Check if filename contains duration info (future enhancement)
                        # Format might be: STUDENT123_2025-01-18_14-30-25_duration-2m34s.pdf
                        if len(name_parts) >= 4 and 'duration-' in name_parts[-1]:
                            duration_part = name_parts[-1].split('duration-')[-1]
                            scan_duration = duration_part.replace('s', 's').replace('m', 'm ')
                    except:
                        # Fallback to file creation time
                        scan_info = time.strftime("%Y-%m-%d %H:%M:%S", creation_time)
                else:
                    # Use file creation time
                    scan_info = time.strftime("%Y-%m-%d %H:%M:%S", creation_time)
                
                pdf_files.append({
                    "filename": pdf_file.name,
                    "display_name": pdf_file.stem,
                    "size_mb": size_mb,
                    "created_at": stat.st_mtime,
                    "scan_info": scan_info,
                    "scan_duration": scan_duration,
                    "formatted_date": time.strftime("%m/%d %H:%M", creation_time),
                    "download_url": f"/api/pdf/download/{pdf_file.name}"
                })
            except Exception as e:
                continue  # Skip files that can't be read
        
        # Sort by creation time (newest first)
        pdf_files.sort(key=lambda x: x["created_at"], reverse=True)
        
        # Clean up old PDFs beyond the limit (keep only latest 5)
        cleanup_count = await cleanup_old_pdfs(pdf_dir, pdf_files, limit)
        
        # Return only the recent PDFs
        recent_pdfs = pdf_files[:limit]
        
        return {
            "status": "success",
            "pdfs": recent_pdfs,
            "total_count": len(recent_pdfs),
            "cleaned_up": cleanup_count,
            "storage_path": str(pdf_dir)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get recent PDFs: {str(e)}")

async def cleanup_old_pdfs(pdf_dir: Path, pdf_files: List[Dict], keep_count: int = 5):
    """Clean up old PDF files, keeping only the most recent ones"""
    cleanup_count = 0
    try:
        if len(pdf_files) <= keep_count:
            return 0  # No cleanup needed
            
        # Files to delete (beyond the keep_count limit)
        files_to_delete = pdf_files[keep_count:]
        
        for file_info in files_to_delete:
            try:
                filename = file_info["filename"]
                
                # Delete the PDF file
                pdf_path = pdf_dir / filename
                if pdf_path.exists() and pdf_path.is_file():
                    pdf_path.unlink()
                    cleanup_count += 1
                    print(f"🗑️ Cleaned up old PDF: {filename}")
                
                # Delete the associated metadata file
                metadata_path = pdf_dir / (filename.replace('.pdf', '.json'))
                if metadata_path.exists() and metadata_path.is_file():
                    metadata_path.unlink()
                    print(f"🗑️ Cleaned up metadata: {metadata_path.name}")
                    
            except Exception as e:
                print(f"⚠️ Failed to delete {file_info['filename']}: {e}")
                continue
                
        if cleanup_count > 0:
            print(f"🧹 PDF cleanup completed: removed {cleanup_count} old files, kept latest {keep_count}")
            
    except Exception as e:
        print(f"❌ PDF cleanup failed: {e}")
        
    return cleanup_count

@router.get("/status")
async def get_pdf_status():
    """Get PDF generation service status"""
    return {
        "status": "ready",
        "service": "PDF Generator",
        "capabilities": {
            "formats": ["A4", "Letter", "Legal", "A3"],
            "orientations": ["portrait", "landscape"],
            "output_formats": ["PDF", "ZIP", "individual images"],
            "max_pages": 1000,
            "max_file_size_mb": 100
        },
        "statistics": {
            "pdfs_generated": 0,
            "images_exported": 0,
            "total_pages_processed": 0
        }
    }
