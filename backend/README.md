# Backend Structure

TODO

## API

## Tenants

InstaClone uses a schema-based tenancy, meaning each tenant has its own schema within a shared database. Example: public, Main tenant schemas in a PostgreSQL database. Tenants are maintained using the django-tenants package.

`init_django.py` defines `public` as the standard tenant schema.

## Workbook

The workbook is provides an interactive way to learn about the functionality of InstaClone. It contains tasks, corresponding to a single question or statement to the user. Tasks are organized as exercises, which are in turn organized as sections. The sections and their subexercises are displayed in the frontend in a navigation bar (ExerciseSidebar component), while the tasks of the current exercise the user is working on are displayed in the center of the screen. For each task, the user can generate a submission, saving their progress across sessions.

Submissions also have a field to store correctness of the submission, which can be used to give points the user, if the answer to the task is correct.
