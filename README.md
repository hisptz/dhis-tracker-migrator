
# DHIS2 tracker to aggregate data migration script

A NodeJS script purposely for extracting tracker programIndicators to aggergate dataElements. Resulting in improving performance of analyzing intensive programIndicators by using mapped dataElements.

### Prerequisites
>- Java JDK v8 or later 
>- Node Js v8 or later

### Installation

> * Clone the repository from Git
```angularjs
git clone https://github.com/hisptz/dhis-tracker-migrator.git
```
> * Enter to the directory and execute the following npm command to install the application to your computer.
```angularjs
npm install
```
> * Once the application is installed and all its dependency hence execute the next command to run the application. 
```angularjs
node data-export.js
```



## Configurations

Inside the data-export.js file, first configure
> * Instance URL of fetching data
> * Add periods on which data will be exctracted from on periods variable
> * Add all required programIndicators in a group and attach that programIndicator group uid on script constants variable
> * Add all required dataElements to receive programIndicator data in a group and attach that dataElement group uid on script constants variable(make sure dataElements should have same name and shortname as its programIndicator)

