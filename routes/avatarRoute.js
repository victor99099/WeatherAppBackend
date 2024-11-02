const express = require('express')
const path = require('path')

const router = express.Router()

router.get('/avatar/:filename' , (req,res)=>{
    const filename = req.params.filename;
    const options = {
        root : path.join(__dirname,'../public/avatar')
    }

    res.sendFile(filename, options, (err)=>{
        if(err){
            console.error('Error fetching avatar' , err)
            res.status(404).json({error : 'Avatar not found'})
        }
    })
})

module.exports = router;

//Image.network('http://your-server-url.com/avatar/avatar/avatar1.png');