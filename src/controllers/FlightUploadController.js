/**
   * Handle file upload
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async uploadFile(req, res) {
    try {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ error: 'No file was uploaded' });
      }

      const file = req.files.file;
      const displayName = req.body.displayName; // Get custom display name if provided
      
      console.log('Received file upload request:', {
        filename: file.name,
        size: file.size, 
        displayName: displayName || file.name
      });
      
      // Check file type (must be CSV)
      if (!file.name.endsWith('.csv')) {
        return res.status(400).json({ error: 'Only CSV files are allowed' });
      }
      
      // Check file size (max 50MB)
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({ error: 'File size exceeds the 50MB limit' });
      }
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '../../data/uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Generate unique filename
      const timestamp = Date.now();
      const uniqueFilename = `${timestamp}_${file.name}`;
      const filePath = path.join(uploadsDir, uniqueFilename);
      
      console.log('Moving file to:', filePath);
      
      // Save file to server
      await file.mv(filePath);
      
      // Record upload in database (removing user_id reference)
      const uploadService = new FlightUploadService();
      const uploadId = await uploadService.recordUpload({
        filename: file.name,
        displayName: displayName || file.name, // Use custom display name if provided
        filePath: filePath,
        fileSize: file.size
      });
      
      console.log(`File uploaded with ID: ${uploadId}, starting processing`);
      
      // Start processing the file in the background
      uploadService.processUpload(uploadId, filePath).catch(error => {
        console.error(`Error processing upload ${uploadId}:`, error);
      });
      
      return res.status(201).json({ 
        id: uploadId,
        status: 'pending',
        message: 'File uploaded successfully and is being processed' 
      });
    } catch (error) {
      console.error('File upload error:', error);
      return res.status(500).json({ error: 'File upload failed' });
    }
  } 