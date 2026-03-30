import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join('public', 'profilePictures'));
    },
    filename: function (req, file, cb) {
        const arr = file.originalname.split('.');
        const ext = arr[arr.length - 1];
        const uniqueSuffix = Date.now() + Math.round(Math.random() * 1e9) + '.' + ext;
        cb(null, file.originalname + '-' + uniqueSuffix);
    },
});

const upload = multer({ storage });

export default upload;
