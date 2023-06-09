import type { DeepPartial, LangiumServices, PartialLangiumServices, RenameProvider } from 'langium'
import type { SemanticIdentity } from './semantic/identity'
import type { IdentityIndex } from './semantic/identity-index'
import type { IdentityManager } from './semantic/identity-manager'
import type { IdentityReconciler } from './semantic/identity-reconciler'
import type { IdentityStorage } from './semantic/identity-storage'
import type { SemanticDomainFactory } from './semantic/semantic-domain'
import type { LangiumSourceModelServer } from './source/source-model-server'
import type { SourceModelService } from './source/source-model-service'
import type { SourceUpdateManager } from './source/source-update-manager'
import type { TypeGuard } from './utils/types'
import type { ExtendableLangiumDocument, LmsDocument } from './workspace/documents'
import type { LmsDocumentBuilder } from './workspace/lms-document-builder'
import type { SourceModelSubscriptions } from './source/source-model-subscriptions'

/**
 * LMS services with default implementation available, not required to be overriden
 */
export type LangiumModelServerDefaultServices = {
    lsp: {
        RenameProvider: RenameProvider,
    },
    workspace: {
        LmsDocumentBuilder: LmsDocumentBuilder
    },
    source: {
        LangiumSourceModelServer: LangiumSourceModelServer,
        SourceModelSubscriptions: SourceModelSubscriptions
    }
}

export type LangiumModelServerAbstractServices<SM extends SemanticIdentity, II extends IdentityIndex, D extends LmsDocument> = {
    workspace: {
        LmsDocumentGuard: TypeGuard<D, ExtendableLangiumDocument>
    },
    semantic: {
        IdentityStorage: IdentityStorage,
        IdentityManager: IdentityManager<II>,
        IdentityReconciler: IdentityReconciler<SM, D>,
        SemanticDomainFactory: SemanticDomainFactory,
    },
    source: {
        SourceModelService: SourceModelService<SM>,
        SourceUpdateManager: SourceUpdateManager<SM>
    }
}

export type LmsSourceServices<SM extends object>
    = Pick<LangiumModelServerAddedServices<SM & SemanticIdentity, IdentityIndex, LmsDocument>, 'source'>['source']

export type LangiumModelServerAddedServices<SM extends SemanticIdentity, II extends IdentityIndex, D extends LmsDocument>
    = LangiumModelServerDefaultServices & LangiumModelServerAbstractServices<SM, II, D>

export type LangiumModelServerServices<SM extends SemanticIdentity, II extends IdentityIndex, D extends LmsDocument>
    = LangiumServices & LangiumModelServerAddedServices<SM, II, D>

export type PartialLangiumModelServerServices<SM extends SemanticIdentity, II extends IdentityIndex, D extends LmsDocument>
    = LangiumModelServerAbstractServices<SM, II, D> & PartialLangiumServices & DeepPartial<LangiumModelServerDefaultServices>
