#!/usr/bin/env bash

echo "Deleting DataValues Audit from ETL Database..."
sudo -u postgres psql -c "delete from datavalueaudit where dataelementid in(select dataelementid from dataelementgroupmembers where dataelementgroupid in(select dataelementgroupid from dataelementgroup where uid='IViQ32rQcso'));" dhis_tz_tracker

echo "Deleting DataValues from ETL Database..."
sudo -u postgres psql -c "delete from datavalue where dataelementid in(select dataelementid from dataelementgroupmembers where dataelementgroupid in(select dataelementgroupid from dataelementgroup where uid='IViQ32rQcso'));" dhis_tz_tracker

echo "Completed"
