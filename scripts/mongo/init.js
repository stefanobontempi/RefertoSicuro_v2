db = db.getSiblingDB('refertosicuro_analytics');
db.createCollection('events');
db.createCollection('metrics');
print("MongoDB initialized");
