# UploadTool Component

## Overview
The UploadTool is a reusable component that provides file upload functionality for the Airport Capacity Planner application. It handles the presentation layer of the upload process, allowing users to select and upload files through an intuitive interface.

## Core Functionality
- **File selection**: Supports both click-to-select and drag-and-drop file selection
- **Progress tracking**: Visual feedback during file upload with progress indicators
- **Error handling**: Clear error messaging when uploads fail
- **File validation**: Basic client-side validation for file size and type
- **Large file support**: Optimized to handle CSV files up to 100,000 lines

## Performance Specifications
The UploadTool is designed to efficiently handle:
- CSV files up to 100,000 lines long
- File sizes up to 50MB (configurable)
- Streaming uploads to minimize browser memory consumption
- Extended timeouts for large file uploads

## Component Responsibility
The UploadTool component is responsible **only** for the file upload process. It does not:
- Validate the content/format of the uploaded data
- Process or transform the uploaded data
- Provide feedback on data quality or accuracy

These responsibilities are handled by separate components in the application workflow.

## Props/Configuration Options

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | string | 'Upload Files' | Title displayed at the top of the component |
| `description` | string | 'Click or drag files to upload' | Helper text explaining the upload action |
| `endpoint` | string | '/api/upload' | API endpoint where files will be uploaded |
| `onUploadSuccess` | function | undefined | Callback function triggered when upload completes successfully |
| `onUploadError` | function | undefined | Callback function triggered when upload fails |
| `acceptedFileTypes` | array | ['.csv', '.xlsx', '.pdf', '.docx'] | Array of accepted file extensions |
| `maxFileSize` | number | 50 | Maximum file size in MB |
| `multiple` | boolean | false | Whether multiple file upload is allowed |
| `timeout` | number | 180000 | Request timeout in milliseconds (3 minutes) |
| `chunkSize` | number | 1048576 | Size of chunks for chunked uploads (1MB) |
| `showProgressDetails` | boolean | false | Show detailed progress information |

## Usage Examples

### Basic Implementation
```jsx
import UploadTool from '../../components/UploadTool';

function AircraftDataPage() {
  return (
    <Layout>
      <UploadTool 
        title="Upload Aircraft Data"
        description="Upload aircraft specifications in CSV or Excel format"
        endpoint="/api/aircraft-types/import"
      />
    </Layout>
  );
}
```

### Large File Upload Implementation
```jsx
import UploadTool from '../../components/UploadTool';
import { message } from 'antd';

function FlightScheduleImportPage() {
  const handleUploadSuccess = (data) => {
    message.success(`Successfully uploaded ${data.filename}. Processing ${data.rows} rows of data.`);
  };
  
  return (
    <Layout>
      <UploadTool 
        title="Import Flight Schedule"
        description="Upload annual flight schedule (CSV format, up to 100,000 flights)"
        endpoint="/api/schedules/import"
        acceptedFileTypes={['.csv']}
        maxFileSize={50}
        timeout={300000}  // 5 minutes
        showProgressDetails={true}
        onUploadSuccess={handleUploadSuccess}
      />
    </Layout>
  );
}
```

## Workflow Integration

The UploadTool is designed to be the first step in a multi-stage data import process:

1. **Upload (UploadTool)**: User uploads file(s) to the server
2. **Validation (separate component)**: Server validates data format and quality
3. **Feedback (separate component)**: User receives feedback on data quality
4. **Confirmation (separate component)**: User confirms import after reviewing validation results

This separation of concerns allows for a more modular and maintainable codebase.

## Large File Handling

For large files (>10MB or >50,000 lines), the component:

1. **Implements chunked uploading**: Breaks files into manageable chunks to prevent browser crashes
2. **Shows detailed progress information**: Displays both percentage and processed rows
3. **Provides cancellation option**: Allows users to abort long-running uploads
4. **Auto-recovers from interruptions**: Can resume uploads after network disruptions

Backend implementations should handle these large files with streaming parsers rather than loading the entire file into memory.

## Styling

The UploadTool follows the application's design system, using Ant Design components for consistent look and feel. The component is responsive and will adapt to different screen sizes.

## Accessibility

The component implements accessibility best practices:
- Keyboard navigation support
- Screen reader-friendly elements
- Clear error messaging
- Visual feedback for actions

## Browser Compatibility

Tested and compatible with:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
