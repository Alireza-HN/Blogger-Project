//node_modules
const express = require('express');
const colors = require('colors');
const multer = require('multer');
const fs = require('fs');

const router = express.Router();

//models
const Article = require('../models/article.js');

//tools
const VALIDATOR = require('../tools/input-validator-server.js');
const multer_config = require('../tools/multer-config.js');
const TOOLS = require('../tools/general-tools.js');
const CHECKER = require('../tools/checker.js');


router.get('/', (req, res) => {
    res.redirect("/");
});

//******************************************************************************** */
//                               New Article Page
//******************************************************************************** */

router.get('/new', (req, res) => 
{
    res.render('new-article.ejs', {
        role: req.session.user.role,
    });
});


//******************************************************************************** */
//                        get all articles of a specific user
//******************************************************************************** */

router.get('/user', async (req, res) => 
{
    try
    {
        //find user aricles sorted by 'createdAt' descended
        await Article.find({author: req.session.user._id}).sort({createdAt: -1}).populate("author").exec((err, articles) => 
        {
            //if database error occured
            if (err) {
                console.log(colors.brightRed("\n" + err + "\n"));
                return res.status(500).send("Something went wrong in finding articles!");
            }


            //if no article found
            if (articles.length === 0) 
            {
                return res.status(404).render("user-articles.ejs", {
                    role: req.session.user.role,
                    status: "no-Article",
                    message: "You have no article!"
                });
            }

            //article(s) found
            else 
            {
                let authors_info = {
                    fname: articles[0].author.firstName,
                    lname: articles[0].author.lastName,
                    avatar: articles[0].author.avatar
                }


                let articles_info = [];
                
                //put all articles inside an array (with needed info)
                for (let i = 0, len = articles.length; i < len; i++)
                {
                    articles_info[i] = {
                        id: articles[i]._id,
                        createdAt: articles[i].createdAt,
                        avatar: articles[i].articleAvatar,
                        title: articles[i].title,
                        summary: articles[i].summary
                    }
                }

                //send NEEDED-author_info and articles to the client
                return res.render("user-articles.ejs", {
                    role: req.session.user.role,
                    authors_info,
                    articles_info,
                    status: "has-Article",
                    articles_for: "user",
                    date_format: TOOLS.format_date
                });
            }
        });
    }

    catch (err) {
        console.log(colors.brightRed("\n" + err + "\n"));
        res.status(500).send("Something went wrong! Try again.");
    }
});



//******************************************************************************** */
//                                  Save New Article
//******************************************************************************** */

router.post('/', async (req, res) => 
{
    try
    {
        //************************************************************** */
        //                        Input Validation     
        //************************************************************** */

        //result of input-validation --> 'true' if there is no error
        let char_cout_validation_result = VALIDATOR.article(req.body, "all");
    
        //if characters count have any errors
        if (char_cout_validation_result !== true) {
            return res.send(char_cout_validation_result);
        }


        //************************************************************** */
        //                     duplicate 'title' check    
        //************************************************************** */

        let duplicate_title_result = await CHECKER.duplicate_title(req.body.title);
        
        if (duplicate_title_result !== "No Conflict") {
            return res.status(409).send(`${duplicate_title_result}`);
        }


        //************************************************************** */
        //                  save new article to database  
        //************************************************************** */

        const new_article = new Article({
            author: req.session.user._id,
            title: req.body.title,
            summary: req.body.summary,
            content: req.body.content
        });

        new_article.save((err) => 
        {
            if (err) {
                console.log(colors.brightRed("\n" + err + "\n"));
                return res.status(500).send("Something went wrong in saving article! Try again.");
            }

            return res.sendStatus(200);
        });
    }

    catch (err) {
        console.log(colors.brightRed("\n" + err + "\n"));
        res.status(500).send("Something went wrong! Try again.");
    }
});



//******************************************************************************** */
//                                 Edit Article Page
//******************************************************************************** */

router.get('/edit/:article_id', async (req, res) => 
{
    try
    {
        //************************************************************** */
        //                  Mongo ObjectID Validation
        //************************************************************** */

        //ckeck 'article_id' to be a valid mongo ObjectID
        let article_id_val = VALIDATOR.ObjectID_val(req.params.article_id)

        //invalid 'article_id'
        if (article_id_val !== true) 
        {
            return res.status(400).render("user-articles.ejs", {
                role: req.session.user.role,
                status: "no-Article",
                message: "Article ID is not valid"
            });
        }


        //************************************************************** */
        //            chcek 'article_id' to be user's own article 
        //************************************************************** */

        let article_check_result = await CHECKER.has_article(req.params.article_id, req.session.user._id);

        if (article_check_result !== true) 
        {
            return res.status(403).render("user-articles.ejs", {
                role: req.session.user.role,
                status: "no-Article",
                message: "You can Not edit this article! Because it's not yours"
            });
        }


        //************************************************************** */
        //                  find the article and its info
        //************************************************************** */        

        let article = await Article.findOne({_id: req.params.article_id}).exec((err, article) => 
        {
            //if database error occured
            if (err) {
                console.log(colors.brightRed("\n" + err + "\n"));
                return res.status(500).send("Something went wrong in finding the article!");
            }


            //if article not found
            if (!article) 
            {
                return res.render("user-articles.ejs", {
                    role: req.session.user.role,
                    status: "no-Article",
                    message: "There is no such article!"
                });
            }

            //article found
            else 
            {
                //************************************************************** */
                //                      send edit article page
                //************************************************************** */

                res.render("edit-article.ejs", {
                    role: req.session.user.role,
                    article_id: req.params.article_id,
                    avatar: article.articleAvatar,
                    title: article.title,
                    summary: article.summary,
                    content: article.content
                });
            }
        });     
    }


    catch (err) {
        console.log(colors.brightRed("\n" + err + "\n"));
        res.status(500).send("Something went wrong! Try again.");
    }
});



//******************************************************************************** */
//                                   Edit Title
//******************************************************************************** */

router.put('/edit/title/:article_id', async (req, res) => 
{
    try
    {
        //************************************************************** */
        //                  Mongo ObjectID Validation
        //************************************************************** */

        //ckeck 'article_id' to be a valid mongo ObjectID
        let article_id_val = VALIDATOR.ObjectID_val(req.params.article_id)

        //invalid 'article_id'
        if (article_id_val !== true) {
            return res.status(400).send(article_id_val);
        }


        //************************************************************** */
        //            chcek 'article_id' to be user's own article 
        //************************************************************** */

        let article_check_result = await CHECKER.has_article(req.params.article_id, req.session.user._id);

        if (article_check_result !== true) {
            return res.status(400).send(article_check_result);
        }


        //************************************************************** */
        //                        Input Validation     
        //************************************************************** */

        //check recieved parameters
        if (!req.body.new_title) {
            return res.status(400).send("No title recieved");
        }

        //result of input-validation --> 'true' if there is no error
        let char_cout_validation_result = VALIDATOR.article(req.body.new_title, "title");
    
        //if characters count have any errors
        if (char_cout_validation_result !== true) {
            return res.status(406).send(char_cout_validation_result);
        }


        //************************************************************** */
        //                     duplicate 'title' check    
        //************************************************************** */

        let duplicate_title_result = await CHECKER.duplicate_title(req.body.new_title);
        
        if (duplicate_title_result !== "No Conflict") {
            return res.status(409).send(`${duplicate_title_result}`);
        }


        //************************************************************** */
        //                      change title to new one
        //************************************************************** */

        Article.findByIdAndUpdate(req.params.article_id, {title: req.body.new_title}, (err) =>
        {
            //if database error occured
            if (err) {
                console.log(colors.brightRed("\n" + err + "\n"));
                return res.status(500).send("Something went wrong in updating or finding the article!");
            }

            return res.send("Article's title updated sucessfully.");
        });
    }


    catch (err) {
        console.log(colors.brightRed("\n" + err + "\n"));
        res.status(500).send("Something went wrong! Try again.");
    }
});



//******************************************************************************** */
//                                  Edit Summary
//******************************************************************************** */

router.put('/edit/summary/:article_id', async (req, res) => 
{
    try
    {
        //************************************************************** */
        //                  Mongo ObjectID Validation
        //************************************************************** */

        //ckeck 'article_id' to be a valid mongo ObjectID
        let article_id_val = VALIDATOR.ObjectID_val(req.params.article_id)

        //invalid 'article_id'
        if (article_id_val !== true) {
            return res.status(400).send(article_id_val);
        }


        //************************************************************** */
        //            chcek 'article_id' to be user's own article 
        //************************************************************** */

        let article_check_result = await CHECKER.has_article(req.params.article_id, req.session.user._id);

        if (article_check_result !== true) {
            return res.status(400).send(article_check_result);
        }


        //************************************************************** */
        //                        Input Validation     
        //************************************************************** */

        //check recieved parameters
        if (!req.body.new_summary) {
            return res.status(400).send("No title recieved");
        }

        //result of input-validation --> 'true' if there is no error
        let char_cout_validation_result = VALIDATOR.article(req.body.new_summary, "summary");
    
        //if characters count have any errors
        if (char_cout_validation_result !== true) {
            return res.status(406).send(char_cout_validation_result);
        }


        //************************************************************** */
        //                      change summary to new one
        //************************************************************** */

        Article.findByIdAndUpdate(req.params.article_id, {summary: req.body.new_summary}, (err) =>
        {
            //if database error occured
            if (err) {
                console.log(colors.brightRed("\n" + err + "\n"));
                return res.status(500).send("Something went wrong in updating or finding the article!");
            }

            return res.send("Article's summary updated sucessfully.");
        });
    }


    catch (err) {
        console.log(colors.brightRed("\n" + err + "\n"));
        res.status(500).send("Something went wrong! Try again.");
    }
});



//******************************************************************************** */
//                                  Edit Content
//******************************************************************************** */

router.put('/edit/content/:article_id', async (req, res) => 
{
    try
    {
        //************************************************************** */
        //                  Mongo ObjectID Validation
        //************************************************************** */

        //ckeck 'article_id' to be a valid mongo ObjectID
        let article_id_val = VALIDATOR.ObjectID_val(req.params.article_id)

        //invalid 'article_id'
        if (article_id_val !== true) {
            return res.status(400).send(article_id_val);
        }


        //************************************************************** */
        //            chcek 'article_id' to be user's own article 
        //************************************************************** */

        let article_check_result = await CHECKER.has_article(req.params.article_id, req.session.user._id);

        if (article_check_result !== true) {
            return res.status(400).send(article_check_result);
        }


        //************************************************************** */
        //                        Input Validation     
        //************************************************************** */

        //check recieved parameters
        if (!req.body.new_content) {
            return res.status(400).send("No title recieved");
        }

        //result of input-validation --> 'true' if there is no error
        let char_cout_validation_result = VALIDATOR.article(req.body.new_content, "content");
    
        //if characters count have any errors
        if (char_cout_validation_result !== true) {
            return res.status(406).send(char_cout_validation_result);
        }


        //************************************************************** */
        //                      change content to new one
        //************************************************************** */

        Article.findByIdAndUpdate(req.params.article_id, {content: req.body.new_content}, (err) =>
        {
            //if database error occured
            if (err) {
                console.log(colors.brightRed("\n" + err + "\n"));
                return res.status(500).send("Something went wrong in updating or finding the article!");
            }

            return res.send("Article's content changed sucessfully.");
        });
    }


    catch (err) {
        console.log(colors.brightRed("\n" + err + "\n"));
        res.status(500).send("Something went wrong! Try again.");
    }
});


//******************************************************************************** */
//                                  Change Avatar
//******************************************************************************** */

router.put('/avatar/:article_id', async (req, res) => 
{
    try
    {
        //************************************************************** */
        //                  Mongo ObjectID Validation
        //************************************************************** */

        //ckeck 'article_id' to be a valid mongo ObjectID
        let article_id_val = VALIDATOR.ObjectID_val(req.params.article_id)

        //invalid 'article_id'
        if (article_id_val !== true) {
            return res.status(400).send(article_id_val);
        }


        //************************************************************** */
        //            chcek 'article_id' to be user's own article 
        //************************************************************** */

        let article_check_result = await CHECKER.has_article(req.params.article_id, req.session.user._id);

        if (article_check_result !== true) {
            return res.status(400).send(article_check_result);
        }


        //************************************************************** */
        //                  Upload Article Avatar
        //************************************************************** */
        
        const upload = multer_config.Article.single('avatar');

        //replace new avatar
        upload(req, res, async function (err) 
        {  
            if (err)
            {
                //multiple file error (just one file/field is accepted)
                if (err instanceof multer.MulterError && err.message === "Unexpected field") {
                    return res.status(400).send(err.message);
                }

                //if NON-acceptable file recieved
                return res.status(400).send(err);
            }

            
            //if no file recieved
            if (!req.file) {
                return res.status(400).send("Empty field error.");
            }


            // *** article avatar updated ***
            
            // previous article avatar is removed automatically
            // because of duplicate filename and extension


            //update database if article avatar is default
            await Article.findOne({_id: req.params.article_id}).exec((err, article) => 
            {
                //if database error occured
                if (err) 
                {
                    console.log(colors.brightRed("\n" + err + "\n"));

                    //remove article's avatar if database error occured
                    fs.unlink(`public/images/articles/${req.file.filename}`, (err) => 
                    {
                        if (err) {
                            console.log(colors.brightRed("\n" + err + "\n"));
                            console.log(colors.brightRed(`Something went wrong in removing new [article: ${req.params.article_id}]'s avatar`) + "\n");
                        }
                    });

                    return res.status(500).send("Something went wrong in finding the article!");
                }

                
                //update database if article avatar is default
                if (article.articleAvatar === "default-article-pic.jpg")
                {
                    Article.findByIdAndUpdate(req.params.article_id, {articleAvatar: req.file.filename}, (err) =>
                    {
                        //if database error occured
                        if (err) 
                        {
                            console.log(colors.brightRed("\n" + err + "\n"));

                            //remove article's avatar if could not update database
                            fs.unlink(`public/images/articles/${req.file.filename}`, (err) => 
                            {
                                if (err) {
                                    console.log(colors.brightRed("\n" + err + "\n"));
                                    console.log(colors.brightRed(`Something went wrong in removing new [article: ${req.params.article_id}]'s avatar`) + "\n");
                                }
                            });

                            return res.status(500).send("Something went wrong in updating or finding the article!");
                        }

                        return res.send("Article's avatar updated sucessfully.");
                    });
                }


                else 
                {
                    //no need to update database for new avatar (if not default)
                    //and no change in its name occures because new one replaces previous one

                    return res.send("Article's avatar updated sucessfully.");
                }
            });
        });
    }

    catch (err) {
        console.log(colors.brightRed("\n" + err + "\n"));
        res.status(500).send("Something went wrong! Try again.");
    }
});



//******************************************************************************** */
//                              Delete Article Avatar
//******************************************************************************** */

router.delete('/avatar/:article_id', async (req, res) => 
{
    try
    {
        //************************************************************** */
        //                  Mongo ObjectID Validation
        //************************************************************** */

        //ckeck 'article_id' to be a valid mongo ObjectID
        let article_id_val = VALIDATOR.ObjectID_val(req.params.article_id)

        //invalid 'article_id'
        if (article_id_val !== true) {
            return res.status(400).send(article_id_val);
        }


        //************************************************************** */
        //            chcek 'article_id' to be user's own article 
        //************************************************************** */

        let article_check_result = await CHECKER.has_article(req.params.article_id, req.session.user._id);

        if (article_check_result !== true) {
            return res.status(400).send(article_check_result);
        }


        //************************************************************** */
        //                  check avatar not to be default
        //************************************************************** */

        await Article.findOne({_id: req.params.article_id}).exec((err, article) => 
        {
            //if database error occured
            if (err) {
                console.log(colors.brightRed("\n" + err + "\n"));
                return res.status(500).send("Something went wrong in finding the article!");
            }


            //************************************************************** */
            //              delete article avatar id not default
            //************************************************************** */

            if (article.articleAvatar !== "default-article-pic.jpg")
            {     
                //remove article's avatar
                fs.unlink(`public/images/articles/${article.articleAvatar}`, (err) => 
                {
                    if (err) {
                        console.log(colors.brightRed("\n" + err + "\n"));
                        console.log(colors.brightRed(`Something went wrong in removing new [article: ${req.params.article_id}]'s avatar`) + "\n");
                    }


                    Article.findByIdAndUpdate(req.params.article_id, {articleAvatar: "default-article-pic.jpg"}, (err, article) =>
                    {
                        //if database error occured
                        if (err) 
                        {
                            console.log(colors.brightRed("\n" + err + "\n"));
                            console.log(colors.brightRed(`Something went wrong in removing new [article: ${req.params.article_id}]'s avatar`) + "\n");
    
                            return res.status(500).send("Something went wrong in deleting or finding the article!");
                        }

                        return res.send("Article's avatar deleted sucessfully.");
                    });
                });
            }

            //if article's avatar is default
            else {
                return res.status(400).send("Default avatar can Not be removed.");
            }
        });

        
    }

    catch (err) {
        console.log(colors.brightRed("\n" + err + "\n"));
        res.status(500).send("Something went wrong! Try again.");
    }
});



//******************************************************************************** */
//                                  Delete Article
//******************************************************************************** */

router.delete('/:article_id', async (req, res) => 
{
    try
    {
        //************************************************************** */
        //                  Mongo ObjectID Validation
        //************************************************************** */

        //ckeck 'article_id' to be a valid mongo ObjectID
        let article_id_val = VALIDATOR.ObjectID_val(req.params.article_id)

        //invalid 'article_id'
        if (article_id_val !== true) {
            return res.status(400).send(article_id_val);
        }


        //************************************************************** */
        //  chcek 'comment_id' to be user's own comment_id if not ADMIN
        //************************************************************** */

        if (req.session.user.role !== "admin")
        {
            let article_check_result = await CHECKER.has_article(req.params.article_id, req.session.user._id);

            if (article_check_result !== true) {
                return res.status(400).send(article_check_result);
            }
        }


        //************************************************************** */
        //                          Delete Article 
        //************************************************************** */
        
        Article.findByIdAndDelete(req.params.article_id, (err) => 
        {
            //if database error occured
            if (err) {
                console.log(colors.brightRed("\n" + err + "\n"));
                return res.status(500).send("Something went wrong in deleteing the article!");
            }

            return res.send("Article deleted sucessfully.");
        });
    }

    catch (err) {
        console.log(colors.brightRed("\n" + err + "\n"));
        res.status(500).send("Something went wrong! Try again.");
    }
});





module.exports = router;