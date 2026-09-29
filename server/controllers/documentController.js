const { Document } = require('../models/models')
const ApiError = require('../error/ApiError')

class DocumentController {
    async create(req, res, next) {
        try {
            const { document_name } = req.body
            const document = await Document.create({ document_name })
            return res.json(document)
        } catch (e) {
            next(ApiError.badRequest(e.message))
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { document_name } = req.body;
            
            if (!id) {
                return next(ApiError.badRequest('Не указан ID документа'));
            }
            
            const document = await Document.findByPk(id);
            if (!document) {
                return next(ApiError.badRequest('Документ не найден'));
            }
            
            if (document_name) {
                await document.update({ document_name });
            }
            
            res.json(document);
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async get(req, res) {
        const docs = await Document.findAll()
        return res.json(docs)
    }

    async delete(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                return next(ApiError.badRequest('Не указан ID документа'));
            }
            const doc = await Document.findByPk(id);
            if (!doc) {
                return next(ApiError.badRequest('Документ не найден'));
            }
            await doc.destroy();
            return res.json({
                message: 'Document deleted successfully',
                deletedDocument: doc
            });
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }
}

module.exports = new DocumentController()