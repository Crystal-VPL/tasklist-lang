import type * as id from '../../../langium-model-server/semantic/semantic-model'
import type * as identity from '../semantic/task-list-semantic-model'
import * as src from '../../../langium-model-server/source/model'
import type * as ast from '../../generated/ast'
import type * as source from '../source/model'
import type { TaskListDocument } from '../workspace/documents'
import { getTaskListDocument } from '../workspace/documents'

export interface TaskListSemanticDomain {
    clear(): void
    setInvalidTasksForModel(model: ast.Model, invalidTasks: Set<ast.Task>): void
    setInvalidReferencesForTask(task: ast.Task, invalidReferences: Set<number>): void
    // NOTE: This is considered as part of manipulation with AST Nodes
    getValidTasks(model: ast.Model): Array<id.Valid<ast.Task>>
    getValidTargetTasks(sourceTask: id.Valid<ast.Task>): Array<id.Valid<ast.Task>>
    /**
     * Maps Valid Task node with semantic identity.
     * @param task Valid AST Task node
     * @param semanticId Id, which {@link task} is identified with
     */
    // NOTE: This is considered as part of manipulation with Source Model preview
    identifyTask(task: id.Valid<ast.Task>, semanticId: string): src.Changes<source.Task> | undefined
    /**
     * Maps Transition derivative identity (there is no AST node corresponded to Transition model,
     * but only a cross reference)
     * @param transition A derivative identity for Transition to map
     * @param semanticId Semantic ID, which {@link transition} is identified with
     */
    // NOTE: Since source model for Transition doesn't have any modifiable attribute, it will not return a Change
    // TODO: But then, do I need it at all?.. If it cannot bring any change, and no other model is based on Transition
    identifyTransition(transition: identity.TransitionDerivativeIdentity, semanticId: string): void
    getIdentifiedTasks(): Iterable<id.Identified<ast.Task>>
    getIdentifiedTransitions(): Iterable<[string, identity.TransitionDerivativeIdentity]>
}

export namespace TaskListSemanticDomain {
    export function initialize(document: TaskListDocument) {
        document.semanticDomain = new PreprocessedTaskListSemanticDomain()
    }
}

class DefaultTaskListSemanticDomain implements TaskListSemanticDomain {

    protected invalidTasks: Set<ast.Task>
    protected invalidReferences: Map<ast.Task, Set<number>>
    private _identifiedTasksById: Map<string, id.Identified<ast.Task>>
    private _previousIdentifiedTaskById: Map<string, id.Identified<ast.Task>>
    private _identifiedTransitionsById: Map<string, identity.TransitionDerivativeIdentity>

    constructor() {
        this.invalidTasks = new Set()
        this.invalidReferences = new Map()
        this._identifiedTasksById = new Map()
        this._previousIdentifiedTaskById = new Map()
        this._identifiedTransitionsById = new Map()
    }

    /* NOTE: SemanticDomain is responsible for semantic model-specific domain logic:

        - Task is valid for Semantic Model (is unique by name within a document)
        - Transition is valid for Semantic Model (is unique by name within a Task).
        - Aggregate functions: getValidTasks, getValidTargetTasks, which deals with Model/Task internals

        So that neither SemanticManager, nor SemanticModelIndex is responsible for traversing AST internals
    */
    protected isTaskSemanticallyValid(task: ast.Task): task is id.Valid<ast.Task> {
        return !this.invalidTasks.has(task)
    }

    protected isTransitionSemanticallyValid(task: id.Valid<ast.Task>, targetTaskIndex: number): boolean {
        return !this.invalidReferences.get(task)?.has(targetTaskIndex)
    }

    public getValidTasks(model: ast.Model): Array<id.Valid<ast.Task>> {
        const validTasks: Array<id.Valid<ast.Task>> = []
        model.tasks.forEach(task => {
            if (this.isTaskSemanticallyValid(task)) {
                validTasks.push(task)
            }
        })
        return validTasks
    }

    public getValidTargetTasks(sourceTask: id.Valid<ast.Task>): Array<id.Valid<ast.Task>> {
        const validTargetTasks: Array<id.Valid<ast.Task>> = []
        sourceTask.references.forEach((targetTaskRef, targetTaskIndex) => {
            const targetTask = targetTaskRef.ref
            if (!!targetTask && this.isTaskSemanticallyValid(targetTask)
                && this.isTransitionSemanticallyValid(sourceTask, targetTaskIndex)) {
                validTargetTasks.push(targetTask)
            }
        })
        return validTargetTasks
    }

    public identifyTask(task: id.Valid<ast.Task>, semanticId: string): src.Changes<source.Task, identity.SemanticTask> | undefined {
        const previousTask = this._previousIdentifiedTaskById.get(semanticId)
        const currentTask = this.assignId(task, semanticId)
        this._identifiedTasksById.set(semanticId, currentTask)
        if (!previousTask) {
            return undefined
        }
        const changes: src.Changes<source.Task, identity.SemanticTask> = {}
        if (previousTask.content !== currentTask.content) {
            changes.content = currentTask.content
        }
        if (src.Changes.areMade(changes)) {
            return changes
        }
        return undefined
    }

    public identifyTransition(transition: identity.TransitionDerivativeIdentity, semanticId: string): void {
        // NOTE: No previous state is stored, since Transition is uneditable from the language model perspective
        this._identifiedTransitionsById.set(semanticId, transition)
    }

    public getIdentifiedTasks(): Iterable<id.Identified<ast.Task>> {
        return this._identifiedTasksById.values()
    }

    public getIdentifiedTransitions(): Iterable<[string, identity.TransitionDerivativeIdentity]> {
        return this._identifiedTransitionsById.entries()
    }

    public clear() {
        this.invalidTasks.clear()
        this.invalidReferences.clear()
        this._previousIdentifiedTaskById = this._identifiedTasksById
        this._identifiedTasksById.clear()
        this._identifiedTransitionsById.clear()
    }

    public setInvalidTasksForModel(model: ast.Model, invalidTasks: Set<ast.Task>): void {
        this.invalidTasks = invalidTasks
    }

    public setInvalidReferencesForTask(task: ast.Task, invalidReferences: Set<number>): void {
        this.invalidReferences.set(task, invalidReferences)
    }

    private assignId(task: id.Valid<ast.Task>, semanticId: string): id.Identified<ast.Task> {
        return Object.assign(task, {id: semanticId})
    }

}

class PreprocessedTaskListSemanticDomain extends DefaultTaskListSemanticDomain {

    private _validTasksByModel = new Map<ast.Model, Array<id.Valid<ast.Task>>>()
    private _validTargetTasksBySourceTask = new Map<id.Valid<ast.Task>, Array<id.Valid<ast.Task>>>()
    private areValidNodesInitialized = false

    public override clear(): void {
        this.areValidNodesInitialized = false
        this._validTasksByModel.clear()
        this._validTargetTasksBySourceTask.clear()
        super.clear()
    }

    public override getValidTasks(model: ast.Model): Array<id.Valid<ast.Task>> {
        if (!this.areValidNodesInitialized) {
            this.initializeValidNodes(model)
        }
        return this._validTasksByModel.get(model) ?? []
    }

    public override getValidTargetTasks(sourceTask: id.Valid<ast.Task>): Array<id.Valid<ast.Task>> {
        if (!this.areValidNodesInitialized) {
            this.initializeValidNodes(getTaskListDocument(sourceTask).parseResult.value)
        }
        return this._validTargetTasksBySourceTask.get(sourceTask) ?? []
    }

    private initializeValidNodes(model: ast.Model): void {
        const validTasks: Array<id.Valid<ast.Task>> = []
        model.tasks.forEach(task => {
            if (this.isTaskSemanticallyValid(task)) {
                validTasks.push(task)
                this._validTargetTasksBySourceTask.set(task, super.getValidTargetTasks(task))
            }
        })
        this._validTasksByModel.set(model, validTasks)
        this.areValidNodesInitialized = true
    }

}