# hwScheduler
Automagically create, query and manage meetings for agents


## Problem Statement
House Whisper empowers real estate agents to be able to book appointments, find availability for different types of tasks and find days that are less busy to reconnect with long term clients. However, the AI system that powers this does not have information about events that were not discussed on the call or in the email. This project helps bridge this gap by peeking into the calendar of the agent in order to find out what is the most up to date set of events in the calendar so that appointments would be scheduled in such a way that they do not overlap/conflict with the existing appointments.

## Design
The problem invovles two parts: building a backend service that exposes APIs for the above mentioned use cases and a chat interface to access those APIs. The backend service has both read and write access to the agent's calendar. The APIs in this service look up events in the calendar, and provide appropriate responses.

Further subsections describe the different components of this service.

### Backend Service
The service is organized into main -> controller -> service layers.

The main file is responsible for setting up the server and the top level routes. There are two controllers - appointmentController and availabilityController. I had initially added a repository layer (for persistence), but found that it added too many moving parts. But a production system would absolutely have a persistence layer to the above architecture.

The controllers call the service that do most of the work. The controllers handle the request and response processing before and after calling the service layer.

The service layer helps with the business logic for each API.

#### Book appointment
The API looks at the calendar to see what events are available and then checks if there is a conflict between what the agent is requesting and what the calendar has at that time. If so, then an error is returned. Else, an appointment gets scheduled and the calendar is updated.

#### Find availability
The API takes time ranges as input and the event type to decide how much of free time is needed in order to book an appointment, and surfaces up the time slots to the user.

#### Find optimal days
The API just takes client ID and agent ID as input and looks for days that are less busy. It sorts them such that the days that are more free is listed at the top and the days that are less free are listed lower.

### API Design
There are 4 REST APIs:
- GET /api/appointments - get all events in the calendar
- POST /api/appointments/book - book an appointment
- GET /api/availability - to find time slots that are available in a given time range
- GET /api/availability/optimal-days - to find which days are less busy

### Runtime
Deno is chosen as the javascript runtime for the following reasons:
- it is extremely fast since it's written in Rust
- it offers several APIs out of the box from its standard library
- it is fully compatible with npm packages

### Storage
To keep things simple, everything is stored in memory as key-value pairs.

## Assumptions
### Agent ID and Client ID
Here, an client is like a real estate company (like Windermere) and an agent is like one of the real estate agents that work for that company. Each of them have an ID. An agent is uniquely identified by the {clientId}#{agentId} combination. In production, these IDs would be UUIDs, but to keep things simple, they are hardcoded as integers. This project also solves the problem by focusing on one agent, but it can be easily extended to multiple agents.

### Calendar storage
The calendars are stored as raw files in the file system and there is an in-memory map of agentId -> calendar. In production, they would be stored and cached separately (like, in S3) and there would either be a two-way sync or there would be a Calendar adapter that reads the calendar from a URL.

### Event types
For querying for available times, the backend service expects one or more time ranges and a duration, so that it can surface available times appropriately. An assumption made here is about the eventType. When an agent is looking for available times, it depends on the type of event they are looking to book. I have created 3 event types - call (15 minutes), meeting (30 minutes) and a showing (1 hour). Based on what type of event the agent is interested in, the available time slots are surfaced. One other assumption I've made here is to keep the duration offset the same as the duration of the event. This is mainly to prevent too many results from cluttering the response, but I do recognize the impact of the decision. For example, if 10am - 12pm is available and the event type is 'Showing', I would return the response as [10am-11am, 11am-12pm]. Having 15 minute blocks would yield a response like [10-11, 10:15-11:15, 10:30-11:30, etc.]

### Work Hours for an Agent.
An agent will have their work hours. For example, they may choose to work Wednesday through Sunday from 10am to 6pm each day. A different agent may have a different schedule. The in-memory data store maintains this and is frequently referenced while looking up available time slots. For example, if the time range is outside of an agent's work hours, the time range gets bounded to the work hours so that meetings won't get scheduled at odd hours (like the middle of the night).