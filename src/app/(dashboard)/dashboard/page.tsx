"use client";

import React from 'react';
import Link from 'next/link';

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/add-item"
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Add New Item
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'Total Items', value: '128', change: '+12%', changeType: 'increase' },
          { title: 'Categories', value: '24', change: '+4%', changeType: 'increase' },
          { title: 'Brands', value: '36', change: '+2%', changeType: 'increase' },
          { title: 'Outfits', value: '12', change: '+50%', changeType: 'increase' },
        ].map((stat, index) => (
          <div key={index} className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {/* Icon could go here */}
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.title}</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">{stat.value}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span 
                  className={`font-medium ${
                    stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {stat.change}
                </span>{' '}
                <span className="text-gray-500">from last month</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Items */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="p-6">
          <h2 className="text-base font-semibold text-gray-900">Recent Items</h2>
          <div className="mt-6 flow-root">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="group relative">
                  <div className="aspect-h-4 aspect-w-3 overflow-hidden rounded-md bg-gray-100">
                    <div className="h-full w-full bg-gray-200"></div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="rounded-md bg-white bg-opacity-75 py-2 px-4 text-sm font-medium text-gray-900 backdrop-blur-sm">
                        Quick View
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        <Link href={`/item/${i}`}>
                          <span aria-hidden="true" className="absolute inset-0" />
                          Item Name {i}
                        </Link>
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">Category</p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">$99.00</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link
                href="/wardrobe"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                View all items
                <span aria-hidden="true"> &rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="p-6">
          <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
          <div className="mt-6 flow-root">
            <ul className="-mb-8">
              {[
                { action: 'Added new item', item: 'Blue Denim Jacket', time: '2 hours ago' },
                { action: 'Created outfit', item: 'Summer Casual', time: '1 day ago' },
                { action: 'Updated item', item: 'Black Sneakers', time: '3 days ago' },
                { action: 'Added new item', item: 'White T-Shirt', time: '5 days ago' },
              ].map((activity, index) => (
                <li key={index}>
                  <div className="relative pb-8">
                    {index !== 3 ? (
                      <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center ring-8 ring-white">
                          {/* Icon could go here */}
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                        <div>
                          <p className="text-sm text-gray-500">
                            {activity.action}{' '}
                            <span className="font-medium text-gray-900">{activity.item}</span>
                          </p>
                        </div>
                        <div className="whitespace-nowrap text-right text-sm text-gray-500">
                          <time>{activity.time}</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
