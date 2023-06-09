import type { AstNode, LangiumDocument, ReferenceDescription } from 'langium'
import { DefaultRenameProvider, findDeclarationNodeAtOffset, getDocument } from 'langium'
import type { RenameParams, WorkspaceEdit } from 'vscode-languageserver'
import { TextEdit } from 'vscode-languageserver'
import type { SemanticIdentity } from '../semantic/identity'
import type { IdentityIndex } from '../semantic/identity-index'
import type { IdentityManager } from '../semantic/identity-manager'
import type { LangiumModelServerServices } from '../services'
import * as src from '../source/model'
import type { SourceModelSubscriptions } from '../source/source-model-subscriptions'
import type { LmsDocument } from '../workspace/documents'

export class LmsRenameProvider<SM extends SemanticIdentity, II extends IdentityIndex, D extends LmsDocument> extends DefaultRenameProvider {

    protected identityManager: IdentityManager
    protected sourceModelSubscriptions: SourceModelSubscriptions

    constructor(services: LangiumModelServerServices<SM, II, D>) {
        super(services)
        this.identityManager = services.semantic.IdentityManager
        this.sourceModelSubscriptions = services.source.SourceModelSubscriptions
    }

    override async rename(document: LangiumDocument, params: RenameParams): Promise<WorkspaceEdit | undefined> {
        const changes: Record<string, TextEdit[]> = {}
        const rootNode = document.parseResult.value.$cstNode
        if (!rootNode) return undefined
        const offset = document.textDocument.offsetAt(params.position)
        const leafNode = findDeclarationNodeAtOffset(rootNode, offset, this.grammarConfig.nameRegexp)
        if (!leafNode) return undefined
        const targetNode = this.references.findDeclaration(leafNode)
        if (!targetNode) return undefined

        const options = { onlyLocal: false, includeDeclaration: true }
        const references = this.references.findReferences(targetNode, options)
        const newNameDefinder = this.getNewNameDefiner(targetNode, params)

        const rootIdentityIndex = this.identityManager.getIdentityIndex(getDocument(targetNode))
        console.debug('Found identity index for the document:', rootIdentityIndex)
        if (rootIdentityIndex) {
            const semanticElement = this.identityManager.findAstBasedIdentity(targetNode)
            console.debug('Found semanticElement for the targetNode:', semanticElement)
            if (semanticElement && semanticElement.updateName(newNameDefinder.targetName)) {
                console.debug('After updating semantic element, its name has changed')
                const rename = src.Rename.create(semanticElement.id, semanticElement.name)
                console.debug('Looking for subscriptions for id', rootIdentityIndex.id)
                for (const sub of this.sourceModelSubscriptions.getSubscriptions(rootIdentityIndex.id)) {
                    sub.pushRename(rename)
                }
            }
        }
        references.forEach(reference => {
            const newName = newNameDefinder.getNameForReference(reference)
            const nodeChange = TextEdit.replace(reference.segment.range, newName)
            const uri = reference.sourceUri.toString()
            if (changes[uri]) {
                changes[uri].push(nodeChange)
            } else {
                changes[uri] = [nodeChange]
            }
        })

        return { changes }
    }

    /**
     * Returns a function, which will be used to define a new name for every given reference to the {@link AstNode} being renamed.
     * Default implementation always returns `params.newName`
     * @param targetNode An {@link AstNode} being renamed
     * @param params The {@link RenameParams} supplied to {@link rename} function
     * @returns a function, that defines a new name for a given reference to a `targetNode`.
     * It may give a different name, e.g., when the element is imported or not (FQN vs simple name)
     */
    protected getNewNameDefiner(targetNode: AstNode, params: RenameParams): NewNameDefiner {
        return {
            getNameForReference: _ => params.newName,
            targetName: params.newName
        }
    }

}

export interface NewNameDefiner {
    getNameForReference: (referenceDescription: ReferenceDescription) => string
    readonly targetName: string
}
