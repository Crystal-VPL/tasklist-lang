import type { AstNode, LangiumDocument, NameProvider } from 'langium'
import { getDocument } from 'langium'
import { URI } from 'vscode-uri'
import type { LangiumModelServerServices } from '../services'
import type { LmsDocument } from '../workspace/documents'
import type { RenameableSemanticIdentity, SemanticIdentity } from './identity'
import type { IdentityIndex, ModelExposedIdentityIndex } from './identity-index'
import type { IdentityStorage } from './identity-storage'

export interface IdentityManager<II extends IdentityIndex = IdentityIndex> {
    getLanguageDocumentUri(id: string): URI | undefined
    /**
     * Searches for a Semantic Identity element, which corresponds to specified {@link astNode} by its name.
     * @returns a view over the identity element, if found.
     * @param astNode An {@link AstNode}, which name is used to find a corresponding semantic identity
     */
    findAstBasedIdentity(astNode: AstNode): RenameableSemanticIdentity | undefined
    getIdentityIndex(langiumDocument: LangiumDocument): II | undefined
    saveSemanticIdentity(languageDocumentUri: string): void
    loadSemanticIdentity(languageDocumentUri: string): void
    deleteSemanticIdentity(languageDocumentUri: string): void
}

export abstract class AbstractIdentityManager<SM extends SemanticIdentity, II extends IdentityIndex, D extends LmsDocument> implements IdentityManager<II> {

    protected identityStorage: IdentityStorage
    protected nameProvider: NameProvider
    private indexRegistryByLanguageDocumentUri: Map<string, ModelExposedIdentityIndex<II>>
    private languageDocumentUriById: Map<string, URI>

    public constructor(services: LangiumModelServerServices<SM, II, D>) {
        this.identityStorage = services.semantic.IdentityStorage
        this.nameProvider = services.references.NameProvider
        this.indexRegistryByLanguageDocumentUri = new Map()
        this.languageDocumentUriById = new Map()
    }

    public getLanguageDocumentUri(id: string): URI | undefined {
        return this.languageDocumentUriById.get(id)
    }

    public findAstBasedIdentity(astNode: AstNode): RenameableSemanticIdentity | undefined {
        const name = this.nameProvider.getName(astNode)
        if (!name) {
            return undefined
        }
        return this.getIdentityIndex(getDocument(astNode)).findElementByName(name)
    }

    public getIdentityIndex(languageDocument: LmsDocument): II {
        return this.getOrLoadIdentity(languageDocument.textDocument.uri)
    }

    public loadSemanticIdentity(languageDocumentUri: string): void {
        const semanticModelIndex = this.loadIdentityToIndex(languageDocumentUri)
        this.languageDocumentUriById.set(semanticModelIndex.id, URI.parse(languageDocumentUri))
        this.indexRegistryByLanguageDocumentUri.set(languageDocumentUri, semanticModelIndex)
    }

    public saveSemanticIdentity(languageDocumentUri: string): void {
        const semanticModel = this.getOrLoadIdentity(languageDocumentUri).model
        this.identityStorage.saveIdentityToFile(languageDocumentUri, semanticModel)
    }

    public deleteSemanticIdentity(languageDocumentUri: string): void {
        const existingModelIndex = this.indexRegistryByLanguageDocumentUri.get(languageDocumentUri)
        if (existingModelIndex) {
            this.indexRegistryByLanguageDocumentUri.delete(languageDocumentUri)
            this.languageDocumentUriById.delete(existingModelIndex.id)
        }
        this.identityStorage.deleteIdentityFile(languageDocumentUri)
    }

    protected abstract loadIdentityToIndex(languageDocumentUri: string): ModelExposedIdentityIndex<II>

    private getOrLoadIdentity(languageDocumentUri: string): ModelExposedIdentityIndex<II> {
        const loadedIdentity = this.indexRegistryByLanguageDocumentUri.get(languageDocumentUri)
        if (loadedIdentity) {
            return loadedIdentity
        }
        this.loadSemanticIdentity(languageDocumentUri)
        return this.indexRegistryByLanguageDocumentUri.get(languageDocumentUri)!
    }
}
