import type { LangiumServices } from 'langium'
import type { SemanticIndexManager } from './semantic/semantic-manager'
import type { SemanticModelStorage } from './semantic/semantic-storage'
import type { SemanticIndex } from './semantic/semantic-types'
import type { SourceModelService } from './source/source-model-service'

export type LangiumModelServerAddedServices<SM = object, SemI extends SemanticIndex = SemanticIndex> = {
    semantic: {
        SemanticModelStorage: SemanticModelStorage,
        SemanticIndexManager: SemanticIndexManager<SemI>,
    },
    source: {
        SourceModelService: SourceModelService<SM>,
    }
}

export type LangiumModelServerServices<SM = object, SemI extends SemanticIndex = SemanticIndex>
    = LangiumServices & LangiumModelServerAddedServices<SM, SemI>
