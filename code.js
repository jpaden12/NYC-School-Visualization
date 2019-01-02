var district_boroughs = {
    "31": "Staten Island",
    "32": "Brookyn"
}

//Popularing district boroughs map
for (i = 1; i < 31; i++) {
    if (i < 7) {
        district_boroughs[i] = "Manhattan";
    } else if (i >= 7 && i < 13) {
        district_boroughs[i] = "Bronx"; 
    } else if (i >= 13 && i < 24) {
        district_boroughs[i] = "Brooklyn";
    } else {
        district_boroughs[i] = "Queens";
    }
}

var tooltip_words = {
    "black": "% Black", 
    "asian": "% Asian", 
    "poor": "% Poverty", 
    "hisp": "% Hispanic", 
    "white": "% White", 
    "disab": "% Students with Disabilities", 
    "multi": "% Multiple Race Categories Not Represented"
}

var slider_years = [2013, 2014, 2015, 2016, 2017]; 
var index = 4; 

//Iniializing slider for years
var sliderStep = d3
    .sliderBottom()
    .min(d3.min(slider_years))
    .max(d3.max(slider_years))
    .width(200)
    .tickFormat(d3.format('d'))
    .ticks(5)
    .step(1)
    
var gStep = d3
    .select('div#slider-step')
    .append('svg')
    .attr('width', 300)
    .attr('height', 55)
    .append('g')
    .attr('transform', 'translate(50,10)');

gStep.call(sliderStep);

var svg = d3.select("#vis");

var projection = d3.geoMercator()
    //center of the map
    .center([-73.979144, 40.741974])
    .scale(55000); //zoom factor

var path = d3.geoPath()
    .projection(projection);

let myMap = d3.map(); 

var colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, 91]); 

var div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0); 

var radios = d3.selectAll("input[name='demographics']")
                .on("change", function() {
                    console.log(this.value);
                    updateColors(this.value); 
                }); 

Promise.all([
    d3.json("nyc-school-topo.json"), 
    d3.csv("1318_District_Demographics.csv") 
]).then(function(data){ 

    let nestedDateData = d3.nest()
        .key(function(d) {
            return d.Year; 
        })
        .entries(data[1]);

    updateMap(nestedDateData[0]); 

    sliderStep.on('onchange', val => {
        index = slider_years.indexOf(val);
        updateMap(nestedDateData[index]);
        console.log(nestedDateData[index]); 
        let checked = d3.select('input[name="demographics"]:checked').node().value; 
        updateColors(checked);  
    });

    svg.selectAll("path")
        .data(topojson.feature(data[0], data[0].objects["nyc-school-geo"]).features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("stroke", "#a8a8a8")
        .attr("class", "district")
        .attr("fill", function(dis) {
            return colorScale(myMap.get(dis.properties.school_dis)["poor"]); 
        })
        .attr("transform", "translate(0, 0)")
        .on("mouseover", function(dis) {

            let name = JSON.stringify(myMap.get(dis.properties.school_dis)["name"]); 
            name = name.slice(1, name.length - 1); 
            let checked = d3.select('input[name="demographics"]:checked').node().value; 
            let demo = JSON.stringify(myMap.get(dis.properties.school_dis)[checked]); 
            demo = Math.trunc(parseFloat(demo.slice(1, demo.length - 1)));
            let tip_word = ""; 

            if (checked == "poor") {
                tip_word = "% Poor"; 
            } else if (checked == "multi") {
                tip_word = "% Multiple Categories"; 
            } else {
                tip_word = tooltip_words[checked]; 
            }

            div.transition()
                .duration(200)
                .style("opacity", .8);
                 
            div.html(
                    '<p id="name">' + name + "</p>" +
                    '<p id="demo">' + demo + tip_word + "</p>" + "<br />"
            )
            .style("left", (d3.event.pageX - 20) + "px")
            .style("top", (d3.event.pageY - 80) + "px");     
        })
        .on("mouseout", function(dis) {
            div.transition()
                .duration(500)
                .style("opacity", 0); 
        });
});

//Updates colors with change of demographic (not year)
function updateColors(value) {

    let max = d3.max(myMap.keys(), function(d) { return myMap.get(d)[value]; }); 
    colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, 100]); 

    svg.selectAll("path")
        .transition()
        .duration(1000)
        .attr("fill", function(dis) {
            return colorScale(myMap.get(dis.properties.school_dis)[value]); 
        })
}

//Updates backing map with new dataset
function updateMap(data) {
    if (!myMap.empty()) {
        myMap.keys().forEach(function(key) {
            myMap.remove(key); 
        });
    }
    data["values"].forEach(function(district) {
        let district_number = parseInt(district["Administrative District"]);
        myMap.set(district_number, 
            {"name": "CSD " + district_number + " " + district_boroughs["" + district_number], 
            "black": district["% Black"], 
            "white": district["% White"],
            "hisp": district["% Hispanic"],  
            "poor": district["% Poverty"], 
            "asian": district["% Asian"],
            "multi": district["% Multiple Race Categories Not Represented"], 
            "disab": district["% Students with Disabilities"] 
        }); 
    }); 
}