const cloudinary = require('cloudinary').v2;

// 1. Configure Cloudinary
cloudinary.config({
  cloud_name: 'dzfcmmhbj',
  api_key: '587328894395133',
  api_secret: 'gYy6JvPsO1enjTAGQqiZZ2NE9fA',
  secure: true
});

async function run() {
  try {
    // 2. Upload an image
    console.log("Uploading image...");
    const result = await cloudinary.uploader.upload('https://res.cloudinary.com/demo/image/upload/sample.jpg', {
      public_id: 'test_sample_image'
    });
    
    console.log("Upload successful!");
    console.log("Secure URL: " + result.secure_url);
    console.log("Public ID: " + result.public_id);
    
    // 3. Get image details
    console.log("\nImage Details:");
    console.log("Width: " + result.width + "px");
    console.log("Height: " + result.height + "px");
    console.log("Format: " + result.format);
    console.log("Size: " + result.bytes + " bytes");
    
    // 4. Transform the image
    // f_auto (fetch_format: 'auto') ensures the best image format for the user's browser (e.g., WebP/AVIF).
    // q_auto (quality: 'auto') optimizes the image file size without visibly affecting visual quality.
    const transformedUrl = cloudinary.url(result.public_id, {
      fetch_format: 'auto', 
      quality: 'auto'       
    });
    
    console.log("\nDone! Click link below to see optimized version of the image. Check the size and the format.");
    console.log(transformedUrl);

  } catch (error) {
    console.error("Error running Cloudinary script:", error);
  }
}

run();
