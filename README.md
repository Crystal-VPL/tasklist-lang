# Task List Language

This repository contains Langium grammar for TaskList language implemented in [GLSP blueprints](https://github.com/eclipse-glsp/glsp-examples/tree/master/project-templates/node-json-theia).

The idea is to connect Langium-based LS to GLSP server as [Source Model Server](https://www.eclipse.org/glsp/documentation/integrations/).

## Environment

This project is built under Node v16.13.1.

## Plans and ideas

This language is supposed to be connected to GLSP, so need to identify corresponding graphical and textual elements.
In the example, demoed here [Langium + Sirius Web = Heart](https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=&ved=2ahUKEwjtjeHY1Mz9AhVUlFwKHRICDKQQwqsBegQIFxAE&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dt-BISMWMtwc&usg=AOvVaw2oh1_5SVKkUAzkYOwXrWvU), they used so called "Semantic ID" to locate an element bidirectionally.

Therefore, 💡 Langium LS should enrich AST with some identifier (i.e., semanticID) before supplying it to GLSP as Source Model.
By default, element `name` can be used. However, there can be cases when element doesn't have a name, or name is only unique within a scope. In this case LS service, that communicates with GLSP will be responsible to generate SemanticID for AST element. Actually, these semanticIDs don't have to be persistent, they only must stay the same during open session from GLSP to LS.

Also, as it can be seen below, Tasks relationships can be coded using different syntax (on AST level it will still be different, but the idea 💡 is to make no difference on the SourceModel level). This mean:

1. SourceModel should be defined separately from the autogenerated AST (e.g., in order to have all the Tasks on the Model level, not nested into each other with `next` keyword as they are now), and Langium service should do bidirectional mapping;
2. TaskList formatter should have some "canonical" representation of semantics ("best" representation can be inferred from the content). Or, perhaps, it won't be the job of formatter, but on the higher level -- deciding how to translate SourceModel to AST? Formatter will be needed anyway, though, to serialize AST itself in the formatted manner from the beginning;
3. When Langium LS service, responsible for serializing AST back to the source file, saves the file, it should apply formatting on it;
4. Since to refer Task (other than using `next` keyword), one should specify Task `name` (which is optional), LS service will have to generate Task `name`, when the user references unnamed task from the diagram view. And here is a complexity: if we are selecting canonical representation, that means, we can delete LS-generated `name` when it is no longer needed (since user didn't create it manually in text), and "collapse" link to `next` whenever possible. But ❗ how to remember, which `name` was generated by LS service, and which one was created/modified by the user❓ Alternatives:

    - To store this information (will have to do it persistently!) on the LS service level;
    - To encode this information into the generated identifier itself (obvious drawback -- the user sees this information in text, which is actually irrelevant to him => extra information contributes to perceptual overload)

Another plan 📃 is to learn how to test Langium-based LS and services
