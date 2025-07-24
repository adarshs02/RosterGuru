import React from "react";
import BaseTable from "@/components/base-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, RefreshCw } from "lucide-react";

export default function PlayersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header Section */}
      <section className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Player Database
              </h1>
              <p className="text-gray-600 max-w-2xl">
                Comprehensive NBA player statistics with historical data, z-scores, and advanced metrics. 
                Explore 10+ years of player performance data to make informed fantasy decisions.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="text-sm">
                500+ Active Players
              </Badge>
              <Badge variant="outline" className="text-sm">
                10+ Years Data
              </Badge>
              <Badge variant="outline" className="text-sm">
                Real-time Updates
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Filters and Search Section */}
      <section className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search players by name, team, or position..."
                className="pl-10 pr-4 py-2"
              />
            </div>
            
            {/* Filter Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Position
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Team
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Overview Cards */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Players
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">487</div>
                <p className="text-xs text-gray-500 mt-1">Active this season</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Average PPG
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">11.2</div>
                <p className="text-xs text-gray-500 mt-1">League average</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Top Z-Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">+2.8</div>
                <p className="text-xs text-gray-500 mt-1">Nikola Jokić</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Last Updated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">2h</div>
                <p className="text-xs text-gray-500 mt-1">ago</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Player Table */}
      <section className="pb-12">
        <div className="container mx-auto px-4">
          <BaseTable
            title="2024-25 NBA Player Rankings"
            showRankings={true}
            showZScore={true}
            className="shadow-lg"
          />
          
          {/* Pagination */}
          <div className="flex justify-center mt-8">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="default" size="sm">
                1
              </Button>
              <Button variant="outline" size="sm">
                2
              </Button>
              <Button variant="outline" size="sm">
                3
              </Button>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
