# Changes Lifecycle

`changes` tracks execution plans, not product requirements.

1. `changes/active/`
   - Current execution plans mapped to active specs.
   - Contains milestones, status, and acceptance gate tracking.

2. `changes/released/`
   - Historical execution plans for shipped versions.
   - Keep as immutable release history.

## Rule

Every `changes/active/*` file must link to:

1. one proposal or active spec
2. one implementation playbook
