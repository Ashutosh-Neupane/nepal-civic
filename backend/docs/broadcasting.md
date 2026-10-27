# Broadcasting

Broadcasting refers to sending messages out of the system via any supported communication channel.

Primarily, Nepal Civic broadcasts messages around the lifecycle of a service request.

The following rules on the `Jurisdiction` relate to configuration of broadcasts:

- `Jurisdiction.filterBroadcastsByDepartment`: **disabled by default**. When this setting is enabled, then, instead of broadcasting Service Request lifecycle event notification to all admin staff, Nepal Civic tries to broadcast to the leads of the Service Request's department instead. If there are no leads, or, if there is no department, Nepal Civic will fall back to broadcasting to all admin staff. (*note*: enabling this setting only makes sense when the Nepal Civic account for a jurisdiction has activiely configured Staff Users and their Department relationships. See [here for further information](./staff-users-and-departments.md).)
- `Jurisdiction.broadcastToSubmitterOnRequestClosed`: **disabled by default**. Enable this to send a notification to submitters when a Service Request moves to a closed state.

In some broadcasting cases, we may have the potential recipients email and phone. By default, Nepal Civic will always choose email as the broadcast channel in this case. However, this can be customized with the setting `Jurisdiction.preferredBroadcastChannel`. 