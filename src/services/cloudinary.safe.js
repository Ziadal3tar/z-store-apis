import cloudinary from "./cloudinary.js";

/** Safely delete a Cloudinary asset. Missing public_id is a no-op. */
export async function destroyCloudinaryAsset(publicId) {
  if (typeof publicId !== "string" || !publicId.trim()) return false;
  try {
    await cloudinary.uploader.destroy(publicId.trim());
    return true;
  } catch (error) {
    console.warn("Cloudinary asset cleanup failed:", publicId, error?.message || error);
    return false;
  }
}
