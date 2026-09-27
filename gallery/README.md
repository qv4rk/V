# FeistTech gallery

Open `/gallery/` to browse the public collection. **Open local folder** also browses images on your phone without uploading them. Checker, white, and dark backgrounds make actual alpha transparency easy to inspect.

To publish a selection from Termux:

```sh
pkg install python
pip install pillow
cd ~/v_project_fresh
mkdir -p gallery/images
cp -n /storage/emulated/0/Pictures/YourFolder/*.png gallery/images/
python gallery/build_gallery.py
git add gallery
git commit -m "Add art gallery"
git push origin main
```

Change `YourFolder` to your actual source directory. For 600 images, copy batches or use `cp -n -r SOURCE/. gallery/images/` for subfolders. Check `du -sh gallery/images` first: GitHub rejects individual files over 100 MiB, and hundreds of 50 MiB originals will make the repository unwieldy. In that case, publish a curated subset or thumbnails here and keep the full-size archive elsewhere. The gallery script does not change the originals; its WebP thumbnails preserve alpha where present. `gallery.json` lists only files under `gallery/images`.
