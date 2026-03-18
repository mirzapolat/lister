# Email List

This App is called “Lister”.

It is a graphic vite app that runs in the browser. All data is stored locally on the computer of the user in our SQL Lite file. On startup the user is promted to load the file. it is modified in place on the computer locally. logging in and logging out means loading and unloading the file. there is no external database.

This is a newsletter app. The user can configure smtp server settings, sender name and sender email. They can import multiple lists of email recepients. They can create campaigns and send them.

There is a header bar and a sidebar. The sidabar has a Lists, Campaigns, Settings.

The List pages and the Campaigns page have database like views. with a table where entires can be sorted, filtered, searched, selected, bulk deleted, imported, exported, selective exported, etc.

On the Lists page there are all the lists. one can create, edit, delete lists. when clicking on a list you get to the list page with the database and everything. Importing is possible via text file, bulk entry in a text field, single email entry.

On the campaings page, you can create campaings, select a list, a subject and write the email. Raw text is possible or html formatted in a nice layout that works with recepients on desktop or mobile or anywhere well. emails are written in markdown style. add markdown helping gui. emails can be send, or saved. saved emails are drafts. send emails are send. categorize the campaings into all, drafts, send. one can take a campaign from before, modify it and send it again.

everything is instantly saved into the sqllite file