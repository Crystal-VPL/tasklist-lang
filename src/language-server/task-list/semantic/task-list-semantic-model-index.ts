import { MultiMap } from 'langium'
import type { SemanticModel, SemanticTask, SemanticTransition } from './task-list-semantic-model'
import { ValueBasedMap } from '../../../langium-model-server/utils/collections'

//TODO: The only reason why I keep _*byId index maps is because I am not certain of the _model format. Probably needs to be removed
export abstract class SemanticModelIndex {
    protected readonly _model: SemanticModel
    private readonly _tasksById: Map<string, SemanticTask> = new Map()
    private readonly _tasksByName: Map<string, SemanticTask> = new Map()
    private readonly _transitionsById: Map<string, SemanticTransition> = new Map()
    private readonly _transitionsByTaskId: MultiMap<string, SemanticTransition> = new MultiMap()
    private readonly _transitionsBySourceTaskIdAndTargetTaskId: ValueBasedMap<[string, string], SemanticTransition> = new ValueBasedMap()

    public constructor(semanticModel: SemanticModel) {
        this._model = semanticModel
        for (const taskId in semanticModel.tasks) {
            if (Object.prototype.hasOwnProperty.call(semanticModel.tasks, taskId)) {
                this.addTaskToIndex(semanticModel.tasks[taskId])
            }
        }
        for (const transitionId in semanticModel.transitions) {
            if (Object.prototype.hasOwnProperty.call(semanticModel.transitions, transitionId)) {
                this.addTransitionToIndex(semanticModel.transitions[transitionId])
            }
        }
    }

    public get tasksByName(): Map<string, SemanticTask> {
        return new Map(this._tasksByName)
    }

    public get transitionsBySourceTaskIdAndTargetTaskId(): ValueBasedMap<[string, string], SemanticTransition> {
        return this._transitionsBySourceTaskIdAndTargetTaskId.copy()
    }

    protected get model(): SemanticModel {
        return this._model
    }

    public addTask(task: SemanticTask) {
        this._model.tasks[task.id] = task
        this.addTaskToIndex(task)
    }

    public getTaskIdByName(name: string): string | undefined {
        return this._tasksByName.get(name)?.id
    }

    public deleteTasksWithRelatedTransitions(tasks: Iterable<SemanticTask>) {
        for (const task of tasks) {
            this.deleteTask(task)
            this.deleteTransitionsForTask(task.id)
        }
    }

    private addTaskToIndex(task: SemanticTask): void {
        this._tasksById.set(task.id, task)
        this._tasksByName.set(task.name, task)
    }

    private deleteTask(task: SemanticTask) {
        delete this._model.tasks[task.id]
        this.removeTaskFromIndex(task)
    }

    private removeTaskFromIndex(task: SemanticTask): void {
        this._tasksById.delete(task.id)
        this._tasksByName.delete(task.name)
    }

    public addTransition(transition: SemanticTransition) {
        this._model.transitions[transition.id] = transition
        this.addTransitionToIndex(transition)
    }

    public deleteTransitions(transitions: Iterable<SemanticTransition>) {
        for (const transition of transitions) {
            this.deleteTransition(transition)
        }
    }

    private deleteTransitionsForTask(sourceTaskId: string) {
        for (const transition of this._transitionsByTaskId.get(sourceTaskId)) {
            this.deleteTransition(transition)
        }
    }

    private addTransitionToIndex(transition: SemanticTransition): void {
        this._transitionsById.set(transition.id, transition)
        this._transitionsByTaskId.add(transition.sourceTaskId, transition)
        this._transitionsByTaskId.add(transition.targetTaskId, transition)
        this._transitionsBySourceTaskIdAndTargetTaskId.set([transition.sourceTaskId, transition.targetTaskId], transition)
    }

    private deleteTransition(transition: SemanticTransition) {
        delete this._model.transitions[transition.id]
        this.removeTransitionFromIndex(transition)
    }

    private removeTransitionFromIndex(transition: SemanticTransition) {
        this._transitionsById.delete(transition.id)
        this._transitionsByTaskId.delete(transition.sourceTaskId, transition)
        this._transitionsByTaskId.delete(transition.targetTaskId, transition)
        this._transitionsBySourceTaskIdAndTargetTaskId.delete([transition.sourceTaskId, transition.targetTaskId])
    }
}